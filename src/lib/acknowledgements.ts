import { agreementHash, AGREEMENT_VERSION } from "./agreement";
import { sql } from "./db";
import type { AppStage } from "./viewer";
import type { AcknowledgementInput } from "./validate";

export type AcknowledgementRow = {
  id: string;
  full_name: string;
  contact: string;
  contact_type: string;
  role: string;
  messenger: string | null;
  has_swh_jersey: boolean | null;
  jersey_or_age_group: string | null;
  agreement_version: string;
  agreement_hash: string;
  created_at: string | Date;
  player_id: string | null;
  cursor_sub: string | null;
  app_stage: string | null;
};

export async function recordAcknowledgement(
  input: AcknowledgementInput,
  opts?: {
    playerId?: string | null;
    cursorSub?: string | null;
    stage?: AppStage | null;
  },
): Promise<AcknowledgementRow> {
  const rows = await sql<AcknowledgementRow>(
    `insert into acknowledgements
      (full_name, contact, contact_type, role, messenger, has_swh_jersey,
       agreement_version, agreement_hash, player_id, cursor_sub, app_stage)
     values ($1, $2, $3, 'player', $4, $5, $6, $7, $8, $9, $10)
     returning id, full_name, contact, contact_type, role, messenger, has_swh_jersey,
               jersey_or_age_group, agreement_version, agreement_hash, created_at,
               player_id, cursor_sub, app_stage`,
    [
      input.fullName,
      input.contact,
      input.contactType,
      input.messenger,
      input.hasSwhJersey,
      AGREEMENT_VERSION,
      agreementHash(),
      opts?.playerId ?? null,
      opts?.cursorSub ?? null,
      opts?.stage ?? null,
    ],
  );
  const row = rows[0];
  if (!row) {
    throw new Error("Failed to store acknowledgement.");
  }
  return row;
}

export async function listAcknowledgements(
  limit = 100,
): Promise<AcknowledgementRow[]> {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  return sql<AcknowledgementRow>(
    `select id, full_name, contact, contact_type, role, messenger, has_swh_jersey,
            jersey_or_age_group, agreement_version, agreement_hash, created_at,
            player_id, cursor_sub, app_stage
     from acknowledgements
     order by created_at desc
     limit $1`,
    [safeLimit],
  );
}
