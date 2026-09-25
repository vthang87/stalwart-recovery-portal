"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { loadCsrf, postJson } from "@/lib/client";

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [csrf, setCsrf] = useState("");
  const [account, setAccount] = useState(params.get("account") || "");
  const [code, setCode] = useState("");
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
      await postJson("/api/password/verify", csrf, { account, code });
      router.push("/reset-password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mã không hợp lệ");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="card narrow" onSubmit={onSubmit}>
      <h1>Nhập mã OTP</h1>
      <p className="lede">Mã có hiệu lực trong thời gian ngắn và chỉ dùng một lần.</p>
      {error ? <div className="alert error">{error}</div> : null}
      <label htmlFor="account">Tài khoản</label>
      <input id="account" value={account} onChange={(e) => setAccount(e.target.value)} required />
      <label htmlFor="code">Mã OTP</label>
      <input id="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required />
      <button className="primary" disabled={pending || !csrf} type="submit">
        Xác minh
      </button>
    </form>
  );
}

export function VerifyForm() {
  return (
    <Suspense>
      <VerifyInner />
    </Suspense>
  );
}
