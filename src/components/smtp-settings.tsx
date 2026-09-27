"use client";

import { useState } from "react";
import { postJson } from "@/lib/client";

export function SmtpSettings({ csrf }: { csrf: string }) {
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function run(task: () => Promise<void>) {
    setPending(true);
    setError("");
    setMessage("");
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : "SMTP error");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card">
      <h1>SMTP</h1>
      <p className="lede">Check the noreply SMTP connection. SMTP errors do not stop the process.</p>
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert ok">{message}</div> : null}
      <button className="primary" type="button" disabled={pending} onClick={() => void run(async () => {
        await postJson("/api/admin/smtp/test", csrf, {});
        setMessage("SMTP connection succeeded.");
      })}>
        Test connection
      </button>
      <label htmlFor="to">Send test email to</label>
      <input id="to" type="email" value={to} onChange={(e) => setTo(e.target.value)} />
      <button className="secondary" type="button" disabled={pending || !to} onClick={() => void run(async () => {
        await postJson("/api/admin/smtp/test", csrf, { to });
        setMessage("Test email sent.");
      })}>
        Send test email
      </button>
    </section>
  );
}
