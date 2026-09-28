"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { Notice } from "@/components/notice";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadCsrf, postJson } from "@/lib/client";

function VerifyInner({ siteKey }: { siteKey: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const [csrf, setCsrf] = useState("");
  const [account, setAccount] = useState(params.get("account") || "");
  const [code, setCode] = useState("");
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
      await postJson("/api/password/verify", csrf, { account, code, turnstileToken });
      router.push("/reset-password");
    } catch (err) {
      setTurnstileToken("");
      setResetSignal((value) => value + 1);
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Enter OTP</CardTitle>
        <CardDescription>The code is short-lived and can only be used once.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <Notice error={error} />
          <div className="grid gap-2">
            <Label htmlFor="account">Account</Label>
            <Input id="account" value={account} onChange={(e) => setAccount(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="code">OTP</Label>
            <Input id="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          <Turnstile siteKey={siteKey} resetSignal={resetSignal} onToken={setTurnstileToken} />
          <Button disabled={pending || !csrf || (Boolean(siteKey) && !turnstileToken)} type="submit">
            <MailCheck data-icon="inline-start" />
            Verify
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function VerifyForm({ siteKey }: { siteKey: string }) {
  return (
    <Suspense>
      <VerifyInner siteKey={siteKey} />
    </Suspense>
  );
}
