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
      profileLinked: boolean;
      magicLinkUrl: string | null;
      magicLinkEmailed: boolean;
      emailRequiredForProfile: boolean;
    };

export type AcknowledgeDefaults = {
  fullName?: string;
  contact?: string;
  contactType?: "email" | "phone";
  messenger?: string;
  hasSwhJersey?: boolean;
};

export function AcknowledgeForm({
  agreementVersion,
  defaults,
  onSuccess,
}: {
  agreementVersion: string;
  defaults?: AcknowledgeDefaults;
  onSuccess?: () => void;
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [contactType, setContactType] = useState<"email" | "phone">(
    defaults?.contactType ?? "email",
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const payload = {
      fullName: String(data.get("fullName") ?? ""),
      contact: String(data.get("contact") ?? ""),
      contactType,
      messenger: String(data.get("messenger") ?? ""),
      hasSwhJersey: data.get("hasSwhJersey") === "on",
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
        profileLinked?: boolean;
        magicLinkUrl?: string | null;
        magicLinkEmailed?: boolean;
        emailRequiredForProfile?: boolean;
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
        profileLinked: Boolean(json.profileLinked),
        magicLinkUrl: json.magicLinkUrl ?? null,
        magicLinkEmailed: Boolean(json.magicLinkEmailed),
        emailRequiredForProfile: Boolean(json.emailRequiredForProfile),
      });
      form.reset();
      setContactType(defaults?.contactType ?? "email");
      onSuccess?.();
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
          {status.profileLinked
            ? " It is linked to your player profile (email)."
            : ""}
        </p>
        {status.emailRequiredForProfile ? (
          <p className="field-hint">
            Tip: use <strong>email</strong> as contact next time to create a
            returnable profile.
          </p>
        ) : null}
        {status.magicLinkEmailed ? (
          <p className="field-hint">
            We emailed you a sign-in link for your profile.
          </p>
        ) : null}
        {status.magicLinkUrl ? (
          <div className="magic-link-box">
            <p>
              <strong>Save this private profile link</strong> (email delivery is
              not configured yet). It expires soon and works once:
            </p>
            <p className="mono magic-link-url">
              <a href={status.magicLinkUrl}>{status.magicLinkUrl}</a>
            </p>
          </div>
        ) : null}
        <div className="hero-cta">
          {status.profileLinked ? (
            <a className="btn btn-primary" href="/profile">
              Open my profile
            </a>
          ) : null}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setStatus({ kind: "idle" })}
          >
            Submit another acknowledgement
          </button>
        </div>
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
          defaultValue={defaults?.fullName}
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
          defaultValue={defaults?.contact}
        />
        <p className="field-hint">
          Use email to create a profile you can return to with a magic link.
          Phone-only acknowledgements are recorded for the club but have no
          self-serve profile.
        </p>
      </fieldset>

      <div className="field">
        <label htmlFor="messenger">Facebook Messenger</label>
        <input
          id="messenger"
          name="messenger"
          type="text"
          required
          maxLength={160}
          placeholder="Messenger name or profile link"
          defaultValue={defaults?.messenger}
        />
        <p className="field-hint">
          Used so the club can add you to the official Messenger group chat.
        </p>
      </div>

      <label className="check-row">
        <input
          id="hasSwhJersey"
          name="hasSwhJersey"
          type="checkbox"
          defaultChecked={defaults?.hasSwhJersey}
        />
        <span>
          I already have an SWH jersey{" "}
          <span className="optional">
            (leave unchecked if the club needs to make one)
          </span>
        </span>
      </label>

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
