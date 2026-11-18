import { NextResponse } from "next/server";
import { recordAcknowledgement } from "@/lib/acknowledgements";
import { AGREEMENT_VERSION, agreementHash } from "@/lib/agreement";
import { isUsingPostgres } from "@/lib/db";
import { emailConfigured, sendMagicLinkEmail } from "@/lib/email";
import { linkPlayerFromAck } from "@/lib/players";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  createMagicLink,
  createSession,
  readSessionPlayer,
  SESSION_COOKIE,
  sessionCookieOptions,
  tryAbsoluteUrl,
} from "@/lib/session";
import { parseAcknowledgementBody } from "@/lib/validate";

export const runtime = "nodejs";

async function maybeEmailMagicLink(input: {
  playerId: string;
  to: string;
  rateKey: string;
}): Promise<boolean> {
  if (!emailConfigured()) return false;
  if (!rateLimit(input.rateKey, 5, 60 * 60 * 1000)) return false;

  const magic = await createMagicLink(input.playerId);
  const magicUrl = tryAbsoluteUrl(
    `/auth/magic?token=${encodeURIComponent(magic.rawToken)}`,
  );
  if (!magicUrl) {
    console.error("magic email skipped: APP_BASE_URL missing");
    return false;
  }
  const sent = await sendMagicLinkEmail({ to: input.to, magicUrl });
  return sent.ok;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseAcknowledgementBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const sessionPlayer = await readSessionPlayer();
    const sessionPlayerId = sessionPlayer ? String(sessionPlayer.id) : null;
    const linked = await linkPlayerFromAck(parsed.data, sessionPlayerId);
    const player = linked.player;
    const playerId = player ? String(player.id) : null;

    const row = await recordAcknowledgement(parsed.data, {
      playerId,
      cursorSub: null,
      stage: player ? "production" : null,
    });

    const ip = clientIp(request);
    let magicLinkEmailed = false;
    let sessionStarted = false;

    // Only start a browser session for a newly created profile or one this
    // browser already owns — never for an email match alone.
    if (linked.kind === "created" || linked.kind === "owned") {
      const session = await createSession(String(player!.id));
      sessionStarted = true;

      magicLinkEmailed = await maybeEmailMagicLink({
        playerId: String(player!.id),
        to: player!.email ?? parsed.data.contact,
        rateKey: `ack-email:${ip}`,
      });

      const response = NextResponse.json(
        {
          ok: true,
          id: String(row.id),
          agreementVersion: AGREEMENT_VERSION,
          agreementHash: agreementHash(),
          createdAt: row.created_at,
          storage: isUsingPostgres() ? "postgres" : "local-sample",
          profileLinked: true,
          profilePath: "/profile",
          sessionStarted: true,
          magicLinkEmailed,
          emailRequiredForProfile: false,
          profileAlreadyExists: false,
        },
        { headers: { "cache-control": "private, no-store" } },
      );
      response.cookies.set(
        SESSION_COOKIE,
        session.rawToken,
        sessionCookieOptions(session.expiresAt),
      );
      return response;
    }

    if (linked.kind === "existing" && player) {
      // Re-ack is recorded and linked; prove email ownership before session.
      magicLinkEmailed = await maybeEmailMagicLink({
        playerId: String(player.id),
        to: player.email ?? parsed.data.contact,
        rateKey: `ack-email:${ip}`,
      });

      return NextResponse.json(
        {
          ok: true,
          id: String(row.id),
          agreementVersion: AGREEMENT_VERSION,
          agreementHash: agreementHash(),
          createdAt: row.created_at,
          storage: isUsingPostgres() ? "postgres" : "local-sample",
          profileLinked: true,
          profilePath: "/profile",
          sessionStarted: false,
          magicLinkEmailed,
          emailRequiredForProfile: false,
          profileAlreadyExists: true,
          note: magicLinkEmailed
            ? "Acknowledgement saved. Check your email for a sign-in link to open your profile."
            : "Acknowledgement saved. This email already has a profile — sign in from /profile when email delivery is configured (or use the browser that already has your session).",
        },
        { headers: { "cache-control": "private, no-store" } },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        id: String(row.id),
        agreementVersion: AGREEMENT_VERSION,
        agreementHash: agreementHash(),
        createdAt: row.created_at,
        storage: isUsingPostgres() ? "postgres" : "local-sample",
        profileLinked: false,
        profilePath: null,
        sessionStarted,
        magicLinkEmailed: false,
        emailRequiredForProfile: true,
        profileAlreadyExists: false,
        note: "Use email as contact to create a returnable player profile.",
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error(
      "acknowledge failed",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json(
      { error: "Could not save your acknowledgement. Please try again." },
      { status: 500 },
    );
  }
}
