import { NextResponse } from "next/server";
import { AGREEMENT_VERSION, agreementHash } from "@/lib/agreement";
import {
  getPlayerBySub,
  listPlayerAcknowledgements,
  needsReAck,
  updatePlayer,
} from "@/lib/players";
import { parseProfilePatchBody } from "@/lib/validate";
import { asPerson, readIdentityFromRequest } from "@/lib/viewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "private, no-store" };

export async function GET(request: Request) {
  const identity = await readIdentityFromRequest(request);
  const person = asPerson(identity);
  if (!person) {
    return NextResponse.json(
      {
        error: "Sign in with Cursor to view your player profile.",
        reason: !identity.verified ? identity.reason : "not_a_person",
      },
      { status: 401, headers: noStore },
    );
  }

  try {
    const player = await getPlayerBySub(person.sub, person.stage);
    if (!player) {
      return NextResponse.json(
        {
          viewer: { name: person.name, email: person.email, simulated: person.simulated },
          player: null,
          acknowledgements: [],
          currentAgreement: {
            version: AGREEMENT_VERSION,
            hash: agreementHash(),
          },
          needsReAck: true,
        },
        { headers: noStore },
      );
    }

    const acknowledgements = await listPlayerAcknowledgements(String(player.id));
    const latest = acknowledgements[0] ?? null;

    return NextResponse.json(
      {
        viewer: { name: person.name, email: person.email, simulated: person.simulated },
        player: {
          id: String(player.id),
          fullName: player.full_name,
          contact: player.contact,
          contactType: player.contact_type,
          messenger: player.messenger,
          hasSwhJersey: player.has_swh_jersey,
          updatedAt: player.updated_at,
        },
        acknowledgements: acknowledgements.map((row) => ({
          id: String(row.id),
          agreementVersion: row.agreement_version,
          agreementHash: row.agreement_hash,
          createdAt: row.created_at,
        })),
        currentAgreement: {
          version: AGREEMENT_VERSION,
          hash: agreementHash(),
        },
        needsReAck: needsReAck(latest),
      },
      { headers: noStore },
    );
  } catch (error) {
    console.error("profile get failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Could not load profile." },
      { status: 500, headers: noStore },
    );
  }
}

export async function PATCH(request: Request) {
  const identity = await readIdentityFromRequest(request);
  const person = asPerson(identity);
  if (!person) {
    return NextResponse.json(
      { error: "Sign in with Cursor to edit your profile." },
      { status: 401, headers: noStore },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers: noStore });
  }

  const parsed = parseProfilePatchBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400, headers: noStore });
  }

  try {
    const player = await updatePlayer(person.sub, person.stage, parsed.data);
    if (!player) {
      return NextResponse.json(
        {
          error:
            "No player profile yet. Acknowledge the agreement first to create one.",
        },
        { status: 404, headers: noStore },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        player: {
          id: String(player.id),
          fullName: player.full_name,
          contact: player.contact,
          contactType: player.contact_type,
          messenger: player.messenger,
          hasSwhJersey: player.has_swh_jersey,
          updatedAt: player.updated_at,
        },
      },
      { headers: noStore },
    );
  } catch (error) {
    console.error("profile patch failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Could not update profile." },
      { status: 500, headers: noStore },
    );
  }
}
