"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Turnstile } from "@/components/turnstile";
import { loadCsrf, postJson } from "@/lib/client";

function VerifyInner({ siteKey }: { siteKey: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const [csrf, setCsrf] = useState("");
  const [account, setAccount] = useState(params.get("account") || "");
  const [code, setCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [resetSignal, setResetSignal] = useState(0);
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
      await postJson("/api/password/verify", csrf, { account, code, turnstileToken });
      router.push("/reset-password");
    } catch (err) {
      setTurnstileToken("");
      setResetSignal((value) => value + 1);
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="card narrow" onSubmit={onSubmit}>
      <h1>Enter OTP</h1>
      <p className="lede">The code is short-lived and can only be used once.</p>
      {error ? <div className="alert error">{error}</div> : null}
      <label htmlFor="account">Account</label>
      <input id="account" value={account} onChange={(e) => setAccount(e.target.value)} required />
      <label htmlFor="code">OTP</label>
      <input id="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required />
      <Turnstile siteKey={siteKey} resetSignal={resetSignal} onToken={setTurnstileToken} />
      <button className="primary" disabled={pending || !csrf || (Boolean(siteKey) && !turnstileToken)} type="submit">
        Verify
      </button>
    </form>
  );
}

export function VerifyForm({ siteKey }: { siteKey: string }) {
  return (
    <Suspense>
      <VerifyInner siteKey={siteKey} />
    </Suspense>
  );
}
