import Link from "next/link";
import { ProfilePanel } from "@/components/ProfilePanel";
import { AGREEMENT_VERSION } from "@/lib/agreement";
import {
  getPlayerBySub,
  listPlayerAcknowledgements,
  needsReAck,
} from "@/lib/players";
import { asPerson, readIdentity } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const identity = await readIdentity();
  const person = asPerson(identity);

  if (!person) {
    return (
      <main className="profile-page">
        <div className="section-inner profile-inner">
          <p className="section-kicker">Player profile</p>
          <h1>Sign in required</h1>
          <p>
            Your player profile is tied to your Cursor account so only you can
            see it. Open this app while signed in (private or team visibility),
            then return here.
          </p>
          <p className="muted">
            Public first-time acknowledgement still works on the home page
            without a profile; we do not look up profiles by email alone.
          </p>
          <p>
            <Link href="/">← Back to agreement</Link>
          </p>
        </div>
      </main>
    );
  }

  const player = await getPlayerBySub(person.sub, person.stage);
  const acknowledgements = player
    ? await listPlayerAcknowledgements(String(player.id))
    : [];
  const latest = acknowledgements[0] ?? null;

  return (
    <main className="profile-page">
      <div className="section-inner profile-inner">
        <p className="section-kicker">Player profile</p>
        <h1>{player?.full_name ?? (person.name || "Your profile")}</h1>
        <p>
          View your membership details, acknowledgement history, and re-ack when
          the club updates the agreement.
        </p>
        <ProfilePanel
          agreementVersion={AGREEMENT_VERSION}
          needsReAck={needsReAck(latest)}
          simulated={person.simulated}
          initialPlayer={
            player
              ? {
                  fullName: player.full_name,
                  contact: player.contact,
                  contactType: player.contact_type as "email" | "phone",
                  messenger: player.messenger,
                  hasSwhJersey: player.has_swh_jersey,
                }
              : null
          }
          acknowledgements={acknowledgements.map((row) => ({
            id: String(row.id),
            agreementVersion: row.agreement_version,
            agreementHash: row.agreement_hash,
            createdAt:
              typeof row.created_at === "string"
                ? row.created_at
                : row.created_at.toISOString(),
          }))}
        />
        <p style={{ marginTop: "1.5rem" }}>
          <Link href="/">← Back to agreement</Link>
        </p>
      </div>
    </main>
  );
}
