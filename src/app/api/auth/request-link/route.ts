import { NextResponse } from "next/server";
import { emailConfigured, sendMagicLinkEmail } from "@/lib/email";
import { getPlayerByEmail, normalizeEmail } from "@/lib/players";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createMagicLink, tryAbsoluteUrl } from "@/lib/session";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Request a magic link for an existing profile.
 * Always returns a generic success message when possible (no account enumeration).
 * Never returns a raw magic link in the JSON body.
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

  const ip = clientIp(request);
  if (!rateLimit(`request-link:ip:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "cache-control": "private, no-store" } },
    );
  }
  if (!rateLimit(`request-link:email:${email}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "cache-control": "private, no-store" } },
    );
  }

  const generic = {
    ok: true,
    message:
      "If that email has a player profile, a sign-in link will be sent when email delivery is configured.",
  };

  try {
    if (!emailConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Email delivery is not configured yet. If you just created your profile on this device, open /profile while this browser still has your session.",
          emailConfigured: false,
        },
        { status: 503, headers: { "cache-control": "private, no-store" } },
      );
    }

    const player = await getPlayerByEmail(email);
    if (!player) {
      return NextResponse.json(
        { ...generic, emailConfigured: true },
        { headers: { "cache-control": "private, no-store" } },
      );
    }

    const magic = await createMagicLink(String(player.id));
    const magicUrl = tryAbsoluteUrl(
      `/auth/magic?token=${encodeURIComponent(magic.rawToken)}`,
    );
    if (!magicUrl) {
      return NextResponse.json(
        { error: "Sign-in links are unavailable until APP_BASE_URL is set." },
        { status: 503, headers: { "cache-control": "private, no-store" } },
      );
    }

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
