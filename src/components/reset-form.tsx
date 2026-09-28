"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Notice } from "@/components/notice";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadCsrf, postJson } from "@/lib/client";

export function ResetForm({ siteKey, minLength, token = "" }: { siteKey: string; minLength: number; token?: string }) {
  const router = useRouter();
  const [csrf, setCsrf] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [resetSignal, setResetSignal] = useState(0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    loadCsrf().then(setCsrf).catch(() => setError("Could not load session."));
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await postJson("/api/password/reset", csrf, { password, turnstileToken, token: token || undefined });
      router.push("/login");
    } catch (err) {
      setTurnstileToken("");
      setResetSignal((value) => value + 1);
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>New password</CardTitle>
        <CardDescription>
          {token
            ? "This link works once. The password is updated on Stalwart, then sign in again."
            : "The password is updated on Stalwart. Sign in again afterward."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <Notice error={error} />
          <div className="grid gap-2">
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" autoComplete="new-password" minLength={minLength} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm">Confirm</Label>
            <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <Turnstile siteKey={siteKey} resetSignal={resetSignal} onToken={setTurnstileToken} />
          <Button disabled={pending || !csrf || (Boolean(siteKey) && !turnstileToken)} type="submit">
            <KeyRound data-icon="inline-start" />
            Reset password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
