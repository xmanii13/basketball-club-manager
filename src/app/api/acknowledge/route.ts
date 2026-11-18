import { NextResponse } from "next/server";
import { recordAcknowledgement } from "@/lib/acknowledgements";
import { AGREEMENT_VERSION, agreementHash } from "@/lib/agreement";
import { isUsingPostgres } from "@/lib/db";
import { parseAcknowledgementBody } from "@/lib/validate";

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
    const row = await recordAcknowledgement(parsed.data);
    return NextResponse.json({
      ok: true,
      id: String(row.id),
      agreementVersion: AGREEMENT_VERSION,
      agreementHash: agreementHash(),
      createdAt: row.created_at,
      storage: isUsingPostgres() ? "postgres" : "local-sample",
    });
  } catch (error) {
    console.error("acknowledge failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Could not save your acknowledgement. Please try again." },
      { status: 500 },
    );
  }
}
