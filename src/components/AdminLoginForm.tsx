"use client";

import { useState, type FormEvent } from "react";

export function AdminLoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const token = String(data.get("token") ?? "");
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Unauthorized.");
        setSubmitting(false);
        return;
      }
      window.location.assign("/admin");
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form className="ack-form" onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor="adminToken">Admin token</label>
        <input
          id="adminToken"
          name="token"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
        />
        <p className="field-hint">
          Enter the club admin token. It is stored in an httpOnly cookie — not
          in the URL.
        </p>
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Checking…" : "Open admin"}
      </button>
    </form>
  );
}
