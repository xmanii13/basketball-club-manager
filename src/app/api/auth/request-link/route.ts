import { NextResponse } from "next/server";
import { emailConfigured, sendMagicLinkEmail } from "@/lib/email";
import { getPlayerByEmail, normalizeEmail } from "@/lib/players";
import { absoluteUrl, createMagicLink } from "@/lib/session";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Request a magic link for an existing profile.
 * Always returns a generic success message (no account enumeration).
 * Without an email provider, we cannot safely deliver a link on lookup alone.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = normalizeEmail(
    typeof body === "object" && body && "email" in body
      ? String((body as { email?: unknown }).email ?? "")
      : "",
  );

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const generic = {
    ok: true,
    message:
      "If that email has a player profile, a sign-in link will be sent when email delivery is configured.",
  };

  try {
    const player = await getPlayerByEmail(email);
    if (!player) {
      return NextResponse.json(generic, {
        headers: { "cache-control": "private, no-store" },
      });
    }

    if (!emailConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Email delivery is not configured yet. Use the profile link shown after you acknowledged (or ask the club once email is set up).",
          emailConfigured: false,
        },
        { status: 503, headers: { "cache-control": "private, no-store" } },
      );
    }

    const magic = await createMagicLink(String(player.id));
    const magicUrl = absoluteUrl(
      request,
      `/auth/magic?token=${encodeURIComponent(magic.rawToken)}`,
    );
    const sent = await sendMagicLinkEmail({
      to: player.email ?? email,
      magicUrl,
    });
    if (!sent.ok) {
      return NextResponse.json(
        { error: "Could not send the email. Try again later." },
        { status: 502, headers: { "cache-control": "private, no-store" } },
      );
    }

    return NextResponse.json(
      { ...generic, emailConfigured: true },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error(
      "request-link failed",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json(
      { error: "Could not process the request." },
      { status: 500 },
    );
  }
}
