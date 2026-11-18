import { cookies } from "next/headers";
import { hashToken, newRawToken } from "./crypto-tokens";
import { sql } from "./db";
import type { PlayerRow } from "./players";

export const SESSION_COOKIE = "swh_session";
const SESSION_DAYS = 30;
const MAGIC_MINUTES = 30;

/**
 * Canonical app origin. Never derived from Host / X-Forwarded-* (spoofable).
 * Production requires APP_BASE_URL; local falls back to loopback.
 */
export function appOrigin(): string {
  const configured = process.env.APP_BASE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") {
    return "http://127.0.0.1:3000";
  }
  throw new Error("APP_BASE_URL is not configured");
}

export function absoluteUrl(path: string): string {
  const origin = appOrigin();
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Same as absoluteUrl, or null when production lacks APP_BASE_URL. */
export function tryAbsoluteUrl(path: string): string | null {
  try {
    return absoluteUrl(path);
  } catch {
    return null;
  }
}

export async function createMagicLink(playerId: string): Promise<{
  rawToken: string;
  expiresAt: Date;
}> {
  const rawToken = newRawToken();
  const expiresAt = new Date(Date.now() + MAGIC_MINUTES * 60 * 1000);
  await sql(
    `insert into magic_links (player_id, token_hash, expires_at)
     values ($1, $2, $3)`,
    [playerId, hashToken(rawToken), expiresAt.toISOString()],
  );
  return { rawToken, expiresAt };
}

export async function consumeMagicLink(
  rawToken: string,
): Promise<PlayerRow | null> {
  const tokenHash = hashToken(rawToken);
  const links = await sql<{
    id: string;
    player_id: string;
    expires_at: string | Date;
    used_at: string | Date | null;
  }>(
    `select id, player_id, expires_at, used_at
     from magic_links
     where token_hash = $1
     limit 1`,
    [tokenHash],
  );
  const link = links[0];
  if (!link || link.used_at) return null;
  const expires =
    typeof link.expires_at === "string"
      ? new Date(link.expires_at)
      : link.expires_at;
  if (Number.isNaN(expires.getTime()) || expires.getTime() < Date.now()) {
    return null;
  }

  await sql(`update magic_links set used_at = now() where id = $1`, [link.id]);

  const players = await sql<PlayerRow>(
    `select id, cursor_sub, app_stage, email, full_name, contact, contact_type,
            messenger, has_swh_jersey, created_at, updated_at
     from players where id = $1 limit 1`,
    [link.player_id],
  );
  return players[0] ?? null;
}

export async function createSession(playerId: string): Promise<{
  rawToken: string;
  expiresAt: Date;
}> {
  const rawToken = newRawToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await sql(
    `insert into player_sessions (player_id, token_hash, expires_at)
     values ($1, $2, $3)`,
    [playerId, hashToken(rawToken), expiresAt.toISOString()],
  );
  return { rawToken, expiresAt };
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

export async function readSessionPlayer(): Promise<PlayerRow | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value?.trim() ?? "";
  if (!raw) return null;
  return playerForSessionToken(raw);
}

export async function playerForSessionToken(
  rawToken: string,
): Promise<PlayerRow | null> {
  const rows = await sql<PlayerRow & { sess_expires: string | Date }>(
    `select p.id, p.cursor_sub, p.app_stage, p.email, p.full_name, p.contact,
            p.contact_type, p.messenger, p.has_swh_jersey, p.created_at, p.updated_at,
            s.expires_at as sess_expires
     from player_sessions s
     join players p on p.id = s.player_id
     where s.token_hash = $1
     limit 1`,
    [hashToken(rawToken)],
  );
  const row = rows[0];
  if (!row) return null;
  const expires =
    typeof row.sess_expires === "string"
      ? new Date(row.sess_expires)
      : row.sess_expires;
  if (Number.isNaN(expires.getTime()) || expires.getTime() < Date.now()) {
    return null;
  }
  return row;
}

export async function destroySession(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await sql(`delete from player_sessions where token_hash = $1`, [
    hashToken(rawToken),
  ]);
}
