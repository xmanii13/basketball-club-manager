import { agreementHash, AGREEMENT_VERSION } from "./agreement";
import { sql } from "./db";
import type { ContactType } from "./validate";

export type PlayerRow = {
  id: string;
  cursor_sub: string | null;
  app_stage: string;
  email: string | null;
  full_name: string;
  contact: string;
  contact_type: string;
  messenger: string;
  has_swh_jersey: boolean;
  created_at: string | Date;
  updated_at: string | Date;
};

export type PlayerAckRow = {
  id: string;
  agreement_version: string;
  agreement_hash: string;
  created_at: string | Date;
};

export type ProfileUpdate = {
  fullName?: string;
  contact?: string;
  contactType?: ContactType;
  messenger?: string;
  hasSwhJersey?: boolean;
};

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export async function getPlayerById(id: string): Promise<PlayerRow | null> {
  const rows = await sql<PlayerRow>(
    `select id, cursor_sub, app_stage, email, full_name, contact, contact_type,
            messenger, has_swh_jersey, created_at, updated_at
     from players where id = $1 limit 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function getPlayerByEmail(email: string): Promise<PlayerRow | null> {
  const normalized = normalizeEmail(email);
  const rows = await sql<PlayerRow>(
    `select id, cursor_sub, app_stage, email, full_name, contact, contact_type,
            messenger, has_swh_jersey, created_at, updated_at
     from players
     where email is not null and lower(email) = $1
     limit 1`,
    [normalized],
  );
  return rows[0] ?? null;
}

/** Upsert by email. Phone-only contacts do not create profiles. */
export async function upsertPlayerFromAck(input: {
  fullName: string;
  contact: string;
  contactType: ContactType;
  messenger: string;
  hasSwhJersey: boolean;
}): Promise<PlayerRow | null> {
  if (input.contactType !== "email") return null;
  const email = normalizeEmail(input.contact);

  const existing = await getPlayerByEmail(email);
  if (existing) {
    const rows = await sql<PlayerRow>(
      `update players set
         full_name = $2,
         contact = $3,
         contact_type = 'email',
         email = $4,
         messenger = $5,
         has_swh_jersey = $6,
         updated_at = now()
       where id = $1
       returning id, cursor_sub, app_stage, email, full_name, contact, contact_type,
                 messenger, has_swh_jersey, created_at, updated_at`,
      [
        existing.id,
        input.fullName,
        input.contact.trim(),
        email,
        input.messenger,
        input.hasSwhJersey,
      ],
    );
    return rows[0] ?? null;
  }

  const rows = await sql<PlayerRow>(
    `insert into players
      (cursor_sub, app_stage, email, full_name, contact, contact_type, messenger, has_swh_jersey)
     values (null, 'production', $1, $2, $3, 'email', $4, $5)
     returning id, cursor_sub, app_stage, email, full_name, contact, contact_type,
               messenger, has_swh_jersey, created_at, updated_at`,
    [email, input.fullName, input.contact.trim(), input.messenger, input.hasSwhJersey],
  );
  return rows[0] ?? null;
}

export async function updatePlayerById(
  playerId: string,
  patch: ProfileUpdate,
): Promise<PlayerRow | null> {
  const current = await getPlayerById(playerId);
  if (!current) return null;

  const fullName = patch.fullName ?? current.full_name;
  const contactType = patch.contactType ?? (current.contact_type as ContactType);
  const contact = patch.contact ?? current.contact;
  const messenger = patch.messenger ?? current.messenger;
  const hasSwhJersey =
    patch.hasSwhJersey !== undefined
      ? patch.hasSwhJersey
      : current.has_swh_jersey;

  // Keep email key stable unless they change email contact.
  const email =
    contactType === "email" ? normalizeEmail(contact) : current.email;

  const rows = await sql<PlayerRow>(
    `update players set
       full_name = $2,
       contact = $3,
       contact_type = $4,
       email = $5,
       messenger = $6,
       has_swh_jersey = $7,
       updated_at = now()
     where id = $1
     returning id, cursor_sub, app_stage, email, full_name, contact, contact_type,
               messenger, has_swh_jersey, created_at, updated_at`,
    [
      playerId,
      fullName,
      contact,
      contactType,
      email,
      messenger,
      hasSwhJersey,
    ],
  );
  return rows[0] ?? null;
}

export async function listPlayerAcknowledgements(
  playerId: string,
  limit = 50,
): Promise<PlayerAckRow[]> {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  return sql<PlayerAckRow>(
    `select id, agreement_version, agreement_hash, created_at
     from acknowledgements
     where player_id = $1
     order by created_at desc
     limit $2`,
    [playerId, safeLimit],
  );
}

export function ackIsCurrent(
  version: string | null | undefined,
  hash: string | null | undefined,
): boolean {
  return version === AGREEMENT_VERSION && hash === agreementHash();
}

export function needsReAck(latest: PlayerAckRow | null | undefined): boolean {
  if (!latest) return true;
  return !ackIsCurrent(latest.agreement_version, latest.agreement_hash);
}
