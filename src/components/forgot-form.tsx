"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadCsrf, postJson } from "@/lib/client";

export function ForgotForm() {
  const router = useRouter();
  const [csrf, setCsrf] = useState("");
  const [account, setAccount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    loadCsrf().then(setCsrf).catch(() => setError("Không tải được phiên làm việc."));
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const data = await postJson("/api/password/forgot", csrf, { account });
      setMessage(data.message || "Nếu tài khoản có email khôi phục đã xác minh, chúng tôi đã gửi mã OTP.");
      router.push(`/verify?account=${encodeURIComponent(account)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi được yêu cầu");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="card narrow" onSubmit={onSubmit}>
      <h1>Quên mật khẩu</h1>
      <p className="lede">Nhập tài khoản mailbox. Phản hồi luôn giống nhau để không lộ tài khoản có tồn tại hay không.</p>
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert ok">{message}</div> : null}
      <label htmlFor="account">Tài khoản</label>
      <input id="account" autoComplete="username" value={account} onChange={(e) => setAccount(e.target.value)} required />
      <button className="primary" disabled={pending || !csrf} type="submit">
        Gửi mã OTP
      </button>
    </form>
  );
}
