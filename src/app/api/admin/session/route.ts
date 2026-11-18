import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  adminOpenLocally,
  adminTokenConfigured,
  expectedAdminCookieValue,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (adminOpenLocally()) {
    return NextResponse.json({ ok: true, local: true });
  }

  const configured = adminTokenConfigured();
  if (!configured) {
    return NextResponse.json(
      { error: "Admin is locked until ADMIN_TOKEN is set." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token =
    typeof body === "object" && body && "token" in body
      ? String((body as { token?: unknown }).token ?? "").trim()
      : "";

  if (!token || token !== configured) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const response = NextResponse.json(
    { ok: true },
    { headers: { "cache-control": "private, no-store" } },
  );
  response.cookies.set(
    ADMIN_COOKIE,
    expectedAdminCookieValue(configured),
    adminCookieOptions(),
  );
  return response;
}

export async function DELETE() {
  const response = NextResponse.json(
    { ok: true },
    { headers: { "cache-control": "private, no-store" } },
  );
  response.cookies.set(ADMIN_COOKIE, "", {
    ...adminCookieOptions(),
    maxAge: 0,
  });
  return response;
}
