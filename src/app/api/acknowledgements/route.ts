import { NextResponse } from "next/server";
import { listAcknowledgements } from "@/lib/acknowledgements";
import { adminAuthorizedFromRequest } from "@/lib/admin-auth";
import { isUsingPostgres } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!adminAuthorizedFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const rows = await listAcknowledgements(200);
    return NextResponse.json({
      storage: isUsingPostgres() ? "postgres" : "local-sample",
      acknowledgements: rows.map((row) => ({
        id: String(row.id),
        fullName: row.full_name,
        contact: row.contact,
        contactType: row.contact_type,
        messenger: row.messenger,
        hasSwhJersey: row.has_swh_jersey,
        agreementVersion: row.agreement_version,
        agreementHash: row.agreement_hash,
        createdAt: row.created_at,
        playerId: row.player_id ? String(row.player_id) : null,
        linkedProfile: Boolean(row.player_id),
      })),
    });
  } catch (error) {
    console.error("list failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Could not load acknowledgements." },
      { status: 500 },
    );
  }
}
