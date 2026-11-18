import { NextResponse } from "next/server";
import { recordAcknowledgement } from "@/lib/acknowledgements";
import { AGREEMENT_VERSION, agreementHash } from "@/lib/agreement";
import { isUsingPostgres } from "@/lib/db";
import { upsertPlayerFromAck } from "@/lib/players";
import { parseAcknowledgementBody } from "@/lib/validate";
import { asPerson, readIdentityFromRequest } from "@/lib/viewer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseAcknowledgementBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const identity = await readIdentityFromRequest(request);
    const person = asPerson(identity);

    let playerId: string | null = null;
    let cursorSub: string | null = null;
    let stage: "production" | "preview" | null = null;

    // Signed-in Cursor person → durable player profile + linked ack history.
    // Unsigned (e.g. public) first-time ack still records membership without a profile.
    if (person) {
      cursorSub = person.sub;
      stage = person.stage;
      const player = await upsertPlayerFromAck({
        cursorSub: person.sub,
        stage: person.stage,
        fullName: parsed.data.fullName,
        contact: parsed.data.contact,
        contactType: parsed.data.contactType,
        messenger: parsed.data.messenger,
        hasSwhJersey: parsed.data.hasSwhJersey,
      });
      playerId = String(player.id);
    }

    const row = await recordAcknowledgement(parsed.data, {
      playerId,
      cursorSub,
      stage,
    });

    return NextResponse.json(
      {
        ok: true,
        id: String(row.id),
        agreementVersion: AGREEMENT_VERSION,
        agreementHash: agreementHash(),
        createdAt: row.created_at,
        storage: isUsingPostgres() ? "postgres" : "local-sample",
        profileLinked: Boolean(playerId),
        profilePath: playerId ? "/profile" : null,
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error(
      "acknowledge failed",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json(
      { error: "Could not save your acknowledgement. Please try again." },
      { status: 500 },
    );
  }
}
