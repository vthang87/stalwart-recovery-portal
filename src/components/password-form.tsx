"use client";

import { useState } from "react";
import { postJson } from "@/lib/client";

export function PasswordForm({ csrf, minLength }: { csrf: string; minLength: number }) {
  const [currentPassword, setCurrent] = useState("");
  const [nextPassword, setNext] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    try {
      await postJson("/api/password/change", csrf, { currentPassword, nextPassword });
      setMessage("Password updated on Stalwart.");
      setCurrent("");
      setNext("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="card narrow" onSubmit={onSubmit}>
      <h1>Change password</h1>
      <p className="lede">The new password is written directly to Stalwart and is not stored in this portal.</p>
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert ok">{message}</div> : null}
      <label htmlFor="current">Current password</label>
      <input id="current" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required />
      <label htmlFor="next">New password</label>
      <input id="next" type="password" autoComplete="new-password" value={nextPassword} onChange={(e) => setNext(e.target.value)} required minLength={minLength} />
      <button className="primary" disabled={pending} type="submit">
        {pending ? "Updating…" : "Change password"}
      </button>
    </form>
  );
}
