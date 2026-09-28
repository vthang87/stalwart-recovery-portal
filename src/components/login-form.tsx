"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Notice } from "@/components/notice";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadCsrf, postJson } from "@/lib/client";

export function LoginForm({ siteKey }: { siteKey: string }) {
  const router = useRouter();
  const [csrf, setCsrf] = useState("");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [resetSignal, setResetSignal] = useState(0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    loadCsrf().then(setCsrf).catch(() => setError("Could not load session."));
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await postJson("/api/auth/login", csrf, { account, password, turnstileToken });
      router.push("/");
      router.refresh();
    } catch (err) {
      setTurnstileToken("");
      setResetSignal((value) => value + 1);
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use your Stalwart mailbox account. This portal does not store passwords.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <Notice error={error} />
          <div className="grid gap-2">
            <Label htmlFor="account">Account</Label>
            <Input id="account" autoComplete="username" value={account} onChange={(e) => setAccount(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Turnstile siteKey={siteKey} resetSignal={resetSignal} onToken={setTurnstileToken} />
          <Button disabled={pending || !csrf || (Boolean(siteKey) && !turnstileToken)} type="submit">
            <LogIn data-icon="inline-start" />
            {pending ? "Signing in…" : "Sign in"}
          </Button>
          <Button variant="link" className="h-auto justify-start px-0" asChild>
            <Link href="/forgot-password">Forgot password</Link>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
