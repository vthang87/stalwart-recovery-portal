"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { appPath } from "@/lib/base-path";

export function Header({ appName, email, isAdmin }: { appName: string; email?: string; isAdmin: boolean }) {
  const router = useRouter();
  async function logout() {
    await fetch(appPath("/api/auth/logout"), { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <header className="topbar">
      <Link className="brand" href={email ? "/" : "/login"}>
        {appName}
      </Link>
      <nav className="nav">
        {email ? (
          <>
            <Link href="/">Tài khoản</Link>
            {isAdmin ? <Link href="/admin/recovery">Quản trị</Link> : null}
            <span>{email}</span>
            <button type="button" onClick={logout}>
              Đăng xuất
            </button>
          </>
        ) : (
          <Link href="/login">Đăng nhập</Link>
        )}
      </nav>
    </header>
  );
}
