"use client";

import { useState } from "react";
import { postJson } from "@/lib/client";

export function RecoveryForm({
  csrf,
  initialEmail,
  verified,
}: {
  csrf: string;
  initialEmail: string;
  verified: boolean;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [isVerified, setVerified] = useState(verified);

  async function run(task: () => Promise<void>) {
    setPending(true);
    setError("");
    setMessage("");
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="card"
      onSubmit={(event) => {
        event.preventDefault();
        void run(async () => {
          await postJson("/api/me/recovery", csrf, { recoveryEmail: email }, "PUT");
          setVerified(false);
          setMessage("Email saved. Send a verification code.");
        });
      }}
    >
      <h1>Recovery email</h1>
      <p className="lede">Unverified addresses cannot be used to reset the password.</p>
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert ok">{message}</div> : null}
      <p>{isVerified ? <span className="status">Verified</span> : <span className="status">Unverified</span>}</p>
      <label htmlFor="recovery">Recovery email</label>
      <input id="recovery" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <button className="primary" disabled={pending} type="submit">
        Save
      </button>
      <button
        className="secondary"
        type="button"
        disabled={pending}
        onClick={() =>
          void run(async () => {
            await postJson("/api/me/recovery", csrf, { recoveryEmail: email }, "PUT");
            await postJson("/api/me/recovery/send-verification", csrf);
            setMessage("OTP sent to the recovery email.");
          })
        }
      >
        Send verification code
      </button>
      <label htmlFor="code">OTP</label>
      <input id="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
      <button
        className="primary"
        type="button"
        disabled={pending || !code}
        onClick={() =>
          void run(async () => {
            await postJson("/api/me/recovery/verify", csrf, { code });
            setVerified(true);
            setMessage("Recovery email verified.");
          })
        }
      >
        Verify
      </button>
    </form>
  );
}
