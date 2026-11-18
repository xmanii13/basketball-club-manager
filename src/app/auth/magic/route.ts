import { NextResponse } from "next/server";
import {
  absoluteUrl,
  consumeMagicLink,
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return NextResponse.redirect(absoluteUrl(request, "/profile?error=missing_token"));
  }

  try {
    const player = await consumeMagicLink(token);
    if (!player) {
      return NextResponse.redirect(absoluteUrl(request, "/profile?error=invalid_link"));
    }
    const session = await createSession(String(player.id));
    const response = NextResponse.redirect(absoluteUrl(request, "/profile"));
    response.cookies.set(
      SESSION_COOKIE,
      session.rawToken,
      sessionCookieOptions(session.expiresAt),
    );
    return response;
  } catch (error) {
    console.error(
      "magic consume failed",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.redirect(absoluteUrl(request, "/profile?error=server"));
  }
}
