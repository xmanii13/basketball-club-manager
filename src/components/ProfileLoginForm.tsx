"use client";

import { useState, type FormEvent } from "react";

export function ProfileLoginForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    setStatus("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as {
        error?: string;
        message?: string;
        emailConfigured?: boolean;
      };
      if (!res.ok) {
        setStatus("error");
        setMessage(json.error ?? "Could not request a link.");
        return;
      }
      setStatus("done");
      setMessage(
        json.message ??
          "If that email has a profile, a sign-in link will be sent.",
      );
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  return (
    <form className="ack-form" onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor="loginEmail">Email used on your acknowledgement</label>
        <input
          id="loginEmail"
          name="email"
          type="email"
          required
          maxLength={160}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>
      {message ? (
        <p className={status === "error" ? "form-error" : "field-hint"} role="status">
          {message}
        </p>
      ) : (
        <p className="field-hint">
          Until an email provider is configured, use the personal profile link
          shown right after you acknowledge. Requesting a link by email alone
          will not reveal whether an account exists.
        </p>
      )}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
