import { NextResponse } from "next/server";
import { recordAcknowledgement } from "@/lib/acknowledgements";
import { AGREEMENT_VERSION, agreementHash } from "@/lib/agreement";
import { isUsingPostgres } from "@/lib/db";
import { emailConfigured, sendMagicLinkEmail } from "@/lib/email";
import { upsertPlayerFromAck } from "@/lib/players";
import {
  absoluteUrl,
  createMagicLink,
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";
import { parseAcknowledgementBody } from "@/lib/validate";

export const runtime = "nodejs";

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
    // Email contact → durable player profile. Phone-only stays guest (club list only).
    const player = await upsertPlayerFromAck(parsed.data);
    const playerId = player ? String(player.id) : null;

    const row = await recordAcknowledgement(parsed.data, {
      playerId,
      cursorSub: null,
      stage: player ? "production" : null,
    });

    let magicLinkUrl: string | null = null;
    let magicLinkEmailed = false;

    if (player) {
      const magic = await createMagicLink(String(player.id));
      magicLinkUrl = absoluteUrl(
        request,
        `/auth/magic?token=${encodeURIComponent(magic.rawToken)}`,
      );

      if (emailConfigured()) {
        const sent = await sendMagicLinkEmail({
          to: player.email ?? parsed.data.contact,
          magicUrl: magicLinkUrl,
        });
        magicLinkEmailed = sent.ok;
        // If email works, do not also return the raw link in JSON.
        if (sent.ok) magicLinkUrl = null;
      }

      // Start a browser session immediately after acknowledge so they can open /profile now.
      const session = await createSession(String(player.id));

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
          magicLinkEmailed,
          // Only present when email is not configured (or send failed): save this link.
          magicLinkUrl,
          emailRequiredForProfile: false,
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
        magicLinkUrl: null,
        magicLinkEmailed: false,
        emailRequiredForProfile: true,
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
