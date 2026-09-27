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
    loadCsrf().then(setCsrf).catch(() => setError("Không tải được phiên làm việc."));
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Mật khẩu nhập lại không khớp.");
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
      setError(err instanceof Error ? err.message : "Không đặt lại được mật khẩu");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="card narrow" onSubmit={onSubmit}>
      <h1>Mật khẩu mới</h1>
      <p className="lede">Mật khẩu được cập nhật trên Stalwart. Sau đó đăng nhập lại.</p>
      {error ? <div className="alert error">{error}</div> : null}
      <label htmlFor="password">Mật khẩu mới</label>
      <input id="password" type="password" autoComplete="new-password" minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} required />
      <label htmlFor="confirm">Nhập lại</label>
      <input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      <Turnstile siteKey={siteKey} resetSignal={resetSignal} onToken={setTurnstileToken} />
      <button className="primary" disabled={pending || !csrf || (Boolean(siteKey) && !turnstileToken)} type="submit">
        Đặt lại mật khẩu
      </button>
    </form>
  );
}
