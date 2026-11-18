import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { ProfileLoginForm } from "@/components/ProfileLoginForm";
import { ProfilePanel } from "@/components/ProfilePanel";
import { AGREEMENT_VERSION } from "@/lib/agreement";
import { emailConfigured } from "@/lib/email";
import {
  listPlayerAcknowledgements,
  needsReAck,
} from "@/lib/players";
import { readSessionPlayer } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const player = await readSessionPlayer();
  const canEmail = emailConfigured();

  if (!player) {
    const errorNote =
      params.error === "invalid_link"
        ? "That sign-in link is invalid or expired. Request a new one or use the link from your acknowledgement."
        : params.error === "missing_token"
          ? "Missing sign-in token."
          : params.error === "server"
            ? "Something went wrong validating the link. Try again."
            : null;

    return (
      <main className="profile-page">
        <div className="section-inner profile-inner">
          <p className="section-kicker">Player profile</p>
          <h1>Sign in to your profile</h1>
          <p>
            Profiles are tied to the <strong>email</strong> you used when
            acknowledging — not a Cursor account. Open your magic link, or
            request a new one below when email delivery is set up.
          </p>
          {errorNote ? <p className="form-error">{errorNote}</p> : null}
          {!canEmail ? (
            <div className="profile-banner warn">
              <p>
                Email delivery is not configured yet. After you acknowledge with
                an email address, save the personal profile link shown on the
                success screen.
              </p>
            </div>
          ) : null}
          <section className="profile-card">
            <h2>Request a magic link</h2>
            <ProfileLoginForm />
          </section>
          <p style={{ marginTop: "1.5rem" }}>
            <Link href="/#acknowledge">Acknowledge on the home page</Link>
            {" · "}
            <Link href="/">← Back</Link>
          </p>
        </div>
      </main>
    );
  }

  const acknowledgements = await listPlayerAcknowledgements(String(player.id));
  const latest = acknowledgements[0] ?? null;

  return (
    <main className="profile-page">
      <div className="section-inner profile-inner">
        <p className="section-kicker">Player profile</p>
        <h1>{player.full_name}</h1>
        <p>
          View your membership details, acknowledgement history, and re-ack when
          the club updates the agreement.
        </p>
        <ProfilePanel
          agreementVersion={AGREEMENT_VERSION}
          needsReAck={needsReAck(latest)}
          initialPlayer={{
            fullName: player.full_name,
            contact: player.contact,
            contactType: player.contact_type as "email" | "phone",
            messenger: player.messenger,
            hasSwhJersey: player.has_swh_jersey,
          }}
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
        <p style={{ marginTop: "1.5rem" }} className="hero-cta">
          <LogoutButton />
          <Link href="/">← Back to agreement</Link>
        </p>
      </div>
    </main>
  );
}
