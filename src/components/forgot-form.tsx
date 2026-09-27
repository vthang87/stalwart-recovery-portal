"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Turnstile } from "@/components/turnstile";
import { loadCsrf, postJson } from "@/lib/client";

export function ForgotForm({ siteKey }: { siteKey: string }) {
  const router = useRouter();
  const [csrf, setCsrf] = useState("");
  const [account, setAccount] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [resetSignal, setResetSignal] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    loadCsrf().then(setCsrf).catch(() => setError("Could not load session."));
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const data = await postJson("/api/password/forgot", csrf, { account, turnstileToken });
      setMessage(data.message || "If this account has a verified recovery email, we sent an OTP.");
      router.push(`/verify?account=${encodeURIComponent(account)}`);
    } catch (err) {
      setTurnstileToken("");
      setResetSignal((value) => value + 1);
      setError(err instanceof Error ? err.message : "Could not submit request");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="card narrow" onSubmit={onSubmit}>
      <h1>Forgot password</h1>
      <p className="lede">Enter your mailbox account. The response is always the same so account existence is not revealed.</p>
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert ok">{message}</div> : null}
      <label htmlFor="account">Account</label>
      <input id="account" autoComplete="username" value={account} onChange={(e) => setAccount(e.target.value)} required />
      <Turnstile siteKey={siteKey} resetSignal={resetSignal} onToken={setTurnstileToken} />
      <button className="primary" disabled={pending || !csrf || (Boolean(siteKey) && !turnstileToken)} type="submit">
        Send OTP
      </button>
    </form>
  );
}
