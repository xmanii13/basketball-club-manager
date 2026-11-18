import { cookies } from "next/headers";
import { hashToken } from "./crypto-tokens";
import { isUsingPostgres } from "./db";

export const ADMIN_COOKIE = "swh_admin";

export function adminTokenConfigured(): string {
  return process.env.ADMIN_TOKEN?.trim() ?? "";
}

/** Local sample mode: open admin when no token and no Postgres. */
export function adminOpenLocally(): boolean {
  return adminTokenConfigured() === "" && !isUsingPostgres();
}

export function expectedAdminCookieValue(token: string): string {
  return hashToken(`swh-admin:${token}`);
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}

export async function hasAdminSession(): Promise<boolean> {
  if (adminOpenLocally()) return true;
  const token = adminTokenConfigured();
  if (!token) return false;
  const jar = await cookies();
  const raw = jar.get(ADMIN_COOKIE)?.value?.trim() ?? "";
  return raw === expectedAdminCookieValue(token);
}

export function adminAuthorizedFromRequest(request: Request): boolean {
  if (adminOpenLocally()) return true;
  const token = adminTokenConfigured();
  if (!token) return false;

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  if (bearer && bearer === token) return true;

  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE}=`));
  const cookieValue = match?.slice(ADMIN_COOKIE.length + 1) ?? "";
  return cookieValue === expectedAdminCookieValue(token);
}
