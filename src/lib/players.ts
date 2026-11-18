import { agreementHash, AGREEMENT_VERSION } from "./agreement";
import { sql } from "./db";
import type { AppStage } from "./viewer";
import type { ContactType } from "./validate";

export type PlayerRow = {
  id: string;
  cursor_sub: string;
  app_stage: string;
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

export async function getPlayerBySub(
  cursorSub: string,
  stage: AppStage,
): Promise<PlayerRow | null> {
  const rows = await sql<PlayerRow>(
    `select id, cursor_sub, app_stage, full_name, contact, contact_type,
            messenger, has_swh_jersey, created_at, updated_at
     from players
     where cursor_sub = $1 and app_stage = $2
     limit 1`,
    [cursorSub, stage],
  );
  return rows[0] ?? null;
}

export async function upsertPlayerFromAck(input: {
  cursorSub: string;
  stage: AppStage;
  fullName: string;
  contact: string;
  contactType: ContactType;
  messenger: string;
  hasSwhJersey: boolean;
}): Promise<PlayerRow> {
  const rows = await sql<PlayerRow>(
    `insert into players
      (cursor_sub, app_stage, full_name, contact, contact_type, messenger, has_swh_jersey)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (cursor_sub, app_stage) do update set
       full_name = excluded.full_name,
       contact = excluded.contact,
       contact_type = excluded.contact_type,
       messenger = excluded.messenger,
       has_swh_jersey = excluded.has_swh_jersey,
       updated_at = now()
     returning id, cursor_sub, app_stage, full_name, contact, contact_type,
               messenger, has_swh_jersey, created_at, updated_at`,
    [
      input.cursorSub,
      input.stage,
      input.fullName,
      input.contact,
      input.contactType,
      input.messenger,
      input.hasSwhJersey,
    ],
  );
  const row = rows[0];
  if (!row) throw new Error("Failed to upsert player.");
  return row;
}

export async function updatePlayer(
  cursorSub: string,
  stage: AppStage,
  patch: ProfileUpdate,
): Promise<PlayerRow | null> {
  const current = await getPlayerBySub(cursorSub, stage);
  if (!current) return null;

  const fullName = patch.fullName ?? current.full_name;
  const contact = patch.contact ?? current.contact;
  const contactType = patch.contactType ?? (current.contact_type as ContactType);
  const messenger = patch.messenger ?? current.messenger;
  const hasSwhJersey =
    patch.hasSwhJersey !== undefined
      ? patch.hasSwhJersey
      : current.has_swh_jersey;

  const rows = await sql<PlayerRow>(
    `update players set
       full_name = $3,
       contact = $4,
       contact_type = $5,
       messenger = $6,
       has_swh_jersey = $7,
       updated_at = now()
     where cursor_sub = $1 and app_stage = $2
     returning id, cursor_sub, app_stage, full_name, contact, contact_type,
               messenger, has_swh_jersey, created_at, updated_at`,
    [cursorSub, stage, fullName, contact, contactType, messenger, hasSwhJersey],
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

export function ackIsCurrent(version: string | null | undefined, hash: string | null | undefined): boolean {
  return version === AGREEMENT_VERSION && hash === agreementHash();
}

export function needsReAck(latest: PlayerAckRow | null | undefined): boolean {
  if (!latest) return true;
  return !ackIsCurrent(latest.agreement_version, latest.agreement_hash);
}
