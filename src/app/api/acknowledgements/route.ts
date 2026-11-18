import { NextResponse } from "next/server";
import { listAcknowledgements } from "@/lib/acknowledgements";
import { isUsingPostgres } from "@/lib/db";

export const runtime = "nodejs";

function authorized(request: Request): boolean {
  const token = process.env.ADMIN_TOKEN?.trim() ?? "";
  if (!token) {
    // Local / sample mode only: allow list when no Postgres and no token.
    return !isUsingPostgres();
  }
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token") ?? "";
  return bearer === token || queryToken === token;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
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
