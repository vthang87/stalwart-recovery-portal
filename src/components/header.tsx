"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import { appPath } from "@/lib/base-path";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header({ appName, email, isAdmin }: { appName: string; email?: string; isAdmin: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    const res = await fetch(appPath("/api/auth/logout"), { method: "POST", credentials: "same-origin", cache: "no-store" });
    if (!res.ok) return;
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <Link href={email ? "/" : "/login"} className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="size-4" />
          {appName}
        </Link>
        <nav className="flex items-center gap-1">
          {email ? (
            <>
              <Button variant={pathname === "/" ? "secondary" : "ghost"} size="sm" asChild>
                <Link href="/">
                  <UserRound data-icon="inline-start" />
                  Account
                </Link>
              </Button>
              {isAdmin ? (
                <Button variant={pathname.startsWith("/admin") ? "secondary" : "ghost"} size="sm" asChild>
                  <Link href="/admin/recovery">
                    <ShieldCheck data-icon="inline-start" />
                    Admin
                  </Link>
                </Button>
              ) : null}
              <span className={cn("hidden px-2 text-sm text-muted-foreground sm:inline")}>{email}</span>
              <Button variant="ghost" size="sm" type="button" onClick={logout}>
                <LogOut data-icon="inline-start" />
                Sign out
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
