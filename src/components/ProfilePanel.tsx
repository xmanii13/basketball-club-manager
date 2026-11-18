"use client";

import { useState, type FormEvent } from "react";
import { AcknowledgeForm } from "./AcknowledgeForm";

export type ProfilePlayer = {
  fullName: string;
  contact: string;
  contactType: "email" | "phone";
  messenger: string;
  hasSwhJersey: boolean;
};

export type ProfileAck = {
  id: string;
  agreementVersion: string;
  agreementHash: string;
  createdAt: string;
};

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ProfilePanel({
  agreementVersion,
  needsReAck,
  initialPlayer,
  acknowledgements,
  simulated,
}: {
  agreementVersion: string;
  needsReAck: boolean;
  initialPlayer: ProfilePlayer | null;
  acknowledgements: ProfileAck[];
  simulated: boolean;
}) {
  const [player, setPlayer] = useState(initialPlayer);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [contactType, setContactType] = useState<"email" | "phone">(
    initialPlayer?.contactType ?? "email",
  );

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!player) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      fullName: String(data.get("fullName") ?? ""),
      contact: String(data.get("contact") ?? ""),
      contactType,
      messenger: String(data.get("messenger") ?? ""),
      hasSwhJersey: data.get("hasSwhJersey") === "on",
    };
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        error?: string;
        player?: {
          fullName: string;
          contact: string;
          contactType: "email" | "phone";
          messenger: string;
          hasSwhJersey: boolean;
        };
      };
      if (!res.ok || !json.player) {
        setStatus("error");
        setError(json.error ?? "Could not save.");
        return;
      }
      setPlayer({
        fullName: json.player.fullName,
        contact: json.player.contact,
        contactType: json.player.contactType,
        messenger: json.player.messenger,
        hasSwhJersey: json.player.hasSwhJersey,
      });
      setContactType(json.player.contactType);
      setEditing(false);
      setStatus("idle");
    } catch {
      setStatus("error");
      setError("Network error. Try again.");
    }
  }

  return (
    <div className="profile-stack">
      {simulated ? (
        <p className="profile-banner muted">
          Local preview uses a simulated Cursor viewer (not a real sign-in).
        </p>
      ) : null}

      {needsReAck ? (
        <div className="profile-banner warn" role="status">
          <p>
            The club agreement has been updated to version{" "}
            <span className="mono">{agreementVersion}</span>. Please review and
            re-acknowledge below.
          </p>
        </div>
      ) : (
        <div className="profile-banner ok" role="status">
          <p>
            Your acknowledgement is current for agreement{" "}
            <span className="mono">{agreementVersion}</span>.
          </p>
        </div>
      )}

      {!player ? (
        <section className="profile-card">
          <h2>Create your player profile</h2>
          <p>
            Acknowledge the agreement while signed in to create a durable
            profile tied to your Cursor account.
          </p>
          <AcknowledgeForm agreementVersion={agreementVersion} />
        </section>
      ) : (
        <section className="profile-card">
          <div className="profile-card-head">
            <h2>Your details</h2>
            {!editing ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            ) : null}
          </div>

          {editing ? (
            <form className="ack-form" onSubmit={onSave} noValidate>
              <div className="field">
                <label htmlFor="fullName">Full name</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  maxLength={120}
                  defaultValue={player.fullName}
                />
              </div>
              <fieldset className="field-group">
                <legend>Contact</legend>
                <div className="segmented" role="group" aria-label="Contact type">
                  <button
                    type="button"
                    className={contactType === "email" ? "is-active" : undefined}
                    onClick={() => setContactType("email")}
                    aria-pressed={contactType === "email"}
                  >
                    Email
                  </button>
                  <button
                    type="button"
                    className={contactType === "phone" ? "is-active" : undefined}
                    onClick={() => setContactType("phone")}
                    aria-pressed={contactType === "phone"}
                  >
                    Phone
                  </button>
                </div>
                <input
                  id="contact"
                  name="contact"
                  type={contactType === "email" ? "email" : "tel"}
                  required
                  maxLength={160}
                  defaultValue={player.contact}
                />
              </fieldset>
              <div className="field">
                <label htmlFor="messenger">Facebook Messenger</label>
                <input
                  id="messenger"
                  name="messenger"
                  type="text"
                  required
                  maxLength={160}
                  defaultValue={player.messenger}
                />
              </div>
              <label className="check-row">
                <input
                  id="hasSwhJersey"
                  name="hasSwhJersey"
                  type="checkbox"
                  defaultChecked={player.hasSwhJersey}
                />
                <span>I already have an SWH jersey</span>
              </label>
              {error ? (
                <p className="form-error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="hero-cta">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={status === "saving"}
                >
                  {status === "saving" ? "Saving…" : "Save profile"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                    setContactType(player.contactType);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <dl className="profile-dl">
              <div>
                <dt>Name</dt>
                <dd>{player.fullName}</dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>
                  {player.contact}{" "}
                  <span className="mono muted">({player.contactType})</span>
                </dd>
              </div>
              <div>
                <dt>Messenger</dt>
                <dd>{player.messenger}</dd>
              </div>
              <div>
                <dt>Jersey</dt>
                <dd>{player.hasSwhJersey ? "Has SWH jersey" : "Needs jersey"}</dd>
              </div>
            </dl>
          )}
        </section>
      )}

      {player && needsReAck ? (
        <section className="profile-card" id="re-acknowledge">
          <h2>Re-acknowledge agreement</h2>
          <p>
            Confirm you have read the updated rules. This adds a new history
            row; earlier acknowledgements stay on file.
          </p>
          <AcknowledgeForm
            agreementVersion={agreementVersion}
            defaults={{
              fullName: player.fullName,
              contact: player.contact,
              contactType: player.contactType,
              messenger: player.messenger,
              hasSwhJersey: player.hasSwhJersey,
            }}
            onSuccess={() => {
              window.location.reload();
            }}
          />
        </section>
      ) : null}

      <section className="profile-card">
        <h2>Acknowledgement history</h2>
        {acknowledgements.length === 0 ? (
          <p className="admin-empty">No acknowledgements linked yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Version</th>
                  <th>Hash</th>
                </tr>
              </thead>
              <tbody>
                {acknowledgements.map((row) => (
                  <tr key={row.id}>
                    <td>{formatWhen(row.createdAt)}</td>
                    <td>
                      <span className="mono">{row.agreementVersion}</span>
                    </td>
                    <td>
                      <span className="mono">{row.agreementHash.slice(0, 12)}…</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Extension points for later club features — stubs only. */}
      <section className="profile-card muted-card" aria-label="Coming later">
        <h2>Coming later</h2>
        <ul className="stub-list">
          <li>
            <strong>Game performance</strong> — per-game stats and season
            summary hooks will attach to this player id.
          </li>
          <li>
            <strong>Media coverage</strong> — photo/video links tagged to the
            player will list here.
          </li>
        </ul>
      </section>
    </div>
  );
}
