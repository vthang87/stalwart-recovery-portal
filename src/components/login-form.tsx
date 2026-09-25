"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadCsrf, postJson } from "@/lib/client";

export function LoginForm() {
  const router = useRouter();
  const [csrf, setCsrf] = useState("");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
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
      await postJson("/api/auth/login", csrf, { account, password });
      router.push("/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="card narrow" onSubmit={onSubmit}>
      <h1>Đăng nhập</h1>
      <p className="lede">Dùng tài khoản mailbox trên Stalwart. Portal không lưu mật khẩu.</p>
      {error ? <div className="alert error">{error}</div> : null}
      <label htmlFor="account">Tài khoản</label>
      <input id="account" autoComplete="username" value={account} onChange={(e) => setAccount(e.target.value)} required />
      <label htmlFor="password">Mật khẩu</label>
      <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button className="primary" disabled={pending || !csrf} type="submit">
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
      <p className="lede">
        <a href="/forgot-password">Quên mật khẩu</a>
      </p>
    </form>
  );
}
