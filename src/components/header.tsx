"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { appPath } from "@/lib/base-path";

export function Header({ appName, email, isAdmin }: { appName: string; email?: string; isAdmin: boolean }) {
  const router = useRouter();
  async function logout() {
    const res = await fetch(appPath("/api/auth/logout"), { method: "POST", credentials: "same-origin", cache: "no-store" });
    if (!res.ok) return;
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
            <Link href="/">Account</Link>
            {isAdmin ? <Link href="/admin/recovery">Admin</Link> : null}
            <span>{email}</span>
            <button type="button" onClick={logout}>
              Sign out
            </button>
          </>
        ) : (
          <Link href="/login">Sign in</Link>
        )}
      </nav>
    </header>
  );
}
