"use client";

import { useRouter } from "next/navigation";

export function Header({ appName, email, isAdmin }: { appName: string; email?: string; isAdmin: boolean }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <header className="topbar">
      <a className="brand" href={email ? "/account" : "/login"}>
        {appName}
      </a>
      <nav className="nav">
        {email ? (
          <>
            <a href="/account">Tài khoản</a>
            {isAdmin ? <a href="/admin/recovery">Quản trị</a> : null}
            <span>{email}</span>
            <button type="button" onClick={logout}>
              Đăng xuất
            </button>
          </>
        ) : (
          <a href="/login">Đăng nhập</a>
        )}
      </nav>
    </header>
  );
}
