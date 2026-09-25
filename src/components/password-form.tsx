"use client";

import { useState } from "react";
import { postJson } from "@/lib/client";

export function PasswordForm({ csrf }: { csrf: string }) {
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
      setMessage("Đã cập nhật mật khẩu trên Stalwart.");
      setCurrent("");
      setNext("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đổi được mật khẩu");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="card narrow" onSubmit={onSubmit}>
      <h1>Đổi mật khẩu</h1>
      <p className="lede">Mật khẩu mới được ghi trực tiếp vào Stalwart, không lưu trong portal.</p>
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert ok">{message}</div> : null}
      <label htmlFor="current">Mật khẩu hiện tại</label>
      <input id="current" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required />
      <label htmlFor="next">Mật khẩu mới</label>
      <input id="next" type="password" autoComplete="new-password" value={nextPassword} onChange={(e) => setNext(e.target.value)} required minLength={12} />
      <button className="primary" disabled={pending} type="submit">
        {pending ? "Đang cập nhật…" : "Đổi mật khẩu"}
      </button>
    </form>
  );
}
