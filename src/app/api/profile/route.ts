import { NextResponse } from "next/server";
import { AGREEMENT_VERSION, agreementHash } from "@/lib/agreement";
import {
  listPlayerAcknowledgements,
  needsReAck,
  updatePlayerById,
} from "@/lib/players";
import { readSessionPlayer } from "@/lib/session";
import { parseProfilePatchBody } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "private, no-store" };

export async function GET() {
  const player = await readSessionPlayer();
  if (!player) {
    return NextResponse.json(
      { error: "Sign in with your email magic link to view your profile." },
      { status: 401, headers: noStore },
    );
  }

  try {
    const acknowledgements = await listPlayerAcknowledgements(String(player.id));
    const latest = acknowledgements[0] ?? null;
    return NextResponse.json(
      {
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
  const player = await readSessionPlayer();
  if (!player) {
    return NextResponse.json(
      { error: "Sign in with your email magic link to edit your profile." },
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
    const updated = await updatePlayerById(String(player.id), parsed.data);
    if (!updated) {
      return NextResponse.json(
        { error: "Could not update profile." },
        { status: 404, headers: noStore },
      );
    }
    return NextResponse.json(
      {
        ok: true,
        player: {
          id: String(updated.id),
          fullName: updated.full_name,
          contact: updated.contact,
          contactType: updated.contact_type,
          messenger: updated.messenger,
          hasSwhJersey: updated.has_swh_jersey,
          updatedAt: updated.updated_at,
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
