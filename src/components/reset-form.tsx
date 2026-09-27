"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Turnstile } from "@/components/turnstile";
import { loadCsrf, postJson } from "@/lib/client";

export function ResetForm({ siteKey }: { siteKey: string }) {
  const router = useRouter();
  const [csrf, setCsrf] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [resetSignal, setResetSignal] = useState(0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    loadCsrf().then(setCsrf).catch(() => setError("Could not load session."));
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await postJson("/api/password/reset", csrf, { password, turnstileToken });
      router.push("/login");
    } catch (err) {
      setTurnstileToken("");
      setResetSignal((value) => value + 1);
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="card narrow" onSubmit={onSubmit}>
      <h1>New password</h1>
      <p className="lede">The password is updated on Stalwart. Sign in again afterward.</p>
      {error ? <div className="alert error">{error}</div> : null}
      <label htmlFor="password">New password</label>
      <input id="password" type="password" autoComplete="new-password" minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} required />
      <label htmlFor="confirm">Confirm</label>
      <input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      <Turnstile siteKey={siteKey} resetSignal={resetSignal} onToken={setTurnstileToken} />
      <button className="primary" disabled={pending || !csrf || (Boolean(siteKey) && !turnstileToken)} type="submit">
        Reset password
      </button>
    </form>
  );
}
