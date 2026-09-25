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
      setError(err instanceof Error ? err.message : "Thất bại");
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
          setMessage("Đã lưu email. Hãy gửi mã xác minh.");
        });
      }}
    >
      <h1>Email khôi phục</h1>
      <p className="lede">Địa chỉ chưa xác minh không được dùng để đặt lại mật khẩu.</p>
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert ok">{message}</div> : null}
      <p>{isVerified ? <span className="status">Đã xác minh</span> : <span className="status">Chưa xác minh</span>}</p>
      <label htmlFor="recovery">Email khôi phục</label>
      <input id="recovery" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <button className="primary" disabled={pending} type="submit">
        Lưu
      </button>
      <button
        className="secondary"
        type="button"
        disabled={pending}
        onClick={() =>
          void run(async () => {
            await postJson("/api/me/recovery", csrf, { recoveryEmail: email }, "PUT");
            await postJson("/api/me/recovery/send-verification", csrf);
            setMessage("Đã gửi mã OTP tới email khôi phục.");
          })
        }
      >
        Gửi mã xác minh
      </button>
      <label htmlFor="code">Mã OTP</label>
      <input id="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
      <button
        className="primary"
        type="button"
        disabled={pending || !code}
        onClick={() =>
          void run(async () => {
            await postJson("/api/me/recovery/verify", csrf, { code });
            setVerified(true);
            setMessage("Email khôi phục đã được xác minh.");
          })
        }
      >
        Xác minh
      </button>
    </form>
  );
}
