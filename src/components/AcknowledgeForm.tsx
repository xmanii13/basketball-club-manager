"use client";

import { useState, type FormEvent } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | {
      kind: "success";
      fullName: string;
      agreementVersion: string;
      storage: string;
    };

export function AcknowledgeForm({ agreementVersion }: { agreementVersion: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [contactType, setContactType] = useState<"email" | "phone">("email");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const payload = {
      fullName: String(data.get("fullName") ?? ""),
      contact: String(data.get("contact") ?? ""),
      contactType,
      role: String(data.get("role") ?? ""),
      jerseyOrAgeGroup: String(data.get("jerseyOrAgeGroup") ?? ""),
      agreed: data.get("agreed") === "on",
    };

    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        error?: string;
        agreementVersion?: string;
        storage?: string;
      };
      if (!res.ok) {
        setStatus({
          kind: "error",
          message: json.error ?? "Something went wrong.",
        });
        return;
      }
      setStatus({
        kind: "success",
        fullName: payload.fullName.trim(),
        agreementVersion: json.agreementVersion ?? agreementVersion,
        storage: json.storage ?? "unknown",
      });
      form.reset();
      setContactType("email");
    } catch {
      setStatus({
        kind: "error",
        message: "Network error. Check your connection and try again.",
      });
    }
  }

  if (status.kind === "success") {
    return (
      <div className="success-panel" role="status" aria-live="polite">
        <p className="success-kicker">You&apos;re on the list</p>
        <h3>Thanks, {status.fullName}.</h3>
        <p>
          Your acknowledgement of agreement version{" "}
          <span className="mono">{status.agreementVersion}</span> is recorded
          {status.storage === "local-sample"
            ? " in this session's sample store (local development)."
            : " as the basis for SWH Basketball Club membership."}
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setStatus({ kind: "idle" })}
        >
          Submit another acknowledgement
        </button>
      </div>
    );
  }

  return (
    <form className="ack-form" onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor="fullName">Full name</label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          maxLength={120}
          placeholder="Jordan Lee"
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
        <label className="sr-only" htmlFor="contact">
          {contactType === "email" ? "Email" : "Phone"}
        </label>
        <input
          id="contact"
          name="contact"
          type={contactType === "email" ? "email" : "tel"}
          autoComplete={contactType === "email" ? "email" : "tel"}
          required
          maxLength={160}
          placeholder={
            contactType === "email" ? "you@example.com" : "+1 (555) 010-2030"
          }
        />
      </fieldset>

      <div className="field">
        <label htmlFor="role">I am acknowledging as</label>
        <select id="role" name="role" required defaultValue="player">
          <option value="player">Player</option>
          <option value="parent-guardian">Parent / guardian</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="jerseyOrAgeGroup">
          Jersey number or age group <span className="optional">(optional)</span>
        </label>
        <input
          id="jerseyOrAgeGroup"
          name="jerseyOrAgeGroup"
          type="text"
          maxLength={80}
          placeholder="U14 · #23"
        />
      </div>

      <label className="check-row">
        <input id="agreed" name="agreed" type="checkbox" required />
        <span>
          I have read the SWH Basketball Club player agreement (version{" "}
          {agreementVersion}) and agree to abide by it as a condition of
          membership.
        </span>
      </label>

      {status.kind === "error" ? (
        <p className="form-error" role="alert">
          {status.message}
        </p>
      ) : null}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={status.kind === "submitting"}
      >
        {status.kind === "submitting" ? "Recording…" : "Acknowledge & join"}
      </button>
    </form>
  );
}
