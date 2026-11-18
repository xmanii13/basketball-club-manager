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
  let basePathOk = true;
  try {
    absoluteUrl("/profile");
  } catch {
    basePathOk = false;
  }
  if (!basePathOk) {
    return NextResponse.json(
      { error: "APP_BASE_URL is not configured." },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return NextResponse.redirect(absoluteUrl("/profile?error=missing_token"));
  }

  try {
    const player = await consumeMagicLink(token);
    if (!player) {
      return NextResponse.redirect(absoluteUrl("/profile?error=invalid_link"));
    }
    const session = await createSession(String(player.id));
    const response = NextResponse.redirect(absoluteUrl("/profile"));
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
    return NextResponse.redirect(absoluteUrl("/profile?error=server"));
  }
}
