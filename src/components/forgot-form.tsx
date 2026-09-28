"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Notice } from "@/components/notice";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadCsrf, postJson } from "@/lib/client";

export function ForgotForm({ siteKey }: { siteKey: string }) {
  const router = useRouter();
  const [csrf, setCsrf] = useState("");
  const [account, setAccount] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [resetSignal, setResetSignal] = useState(0);
  const [message, setMessage] = useState("");
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
      const data = await postJson("/api/password/forgot", csrf, { account, turnstileToken });
      setMessage(data.message || "If this account has a verified recovery email, we sent an OTP.");
      router.push(`/verify?account=${encodeURIComponent(account)}`);
    } catch (err) {
      setTurnstileToken("");
      setResetSignal((value) => value + 1);
      setError(err instanceof Error ? err.message : "Could not submit request");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>Enter your mailbox account. The response is always the same so account existence is not revealed.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <Notice error={error} message={message} />
          <div className="grid gap-2">
            <Label htmlFor="account">Account</Label>
            <Input id="account" autoComplete="username" value={account} onChange={(e) => setAccount(e.target.value)} required />
          </div>
          <Turnstile siteKey={siteKey} resetSignal={resetSignal} onToken={setTurnstileToken} />
          <Button disabled={pending || !csrf || (Boolean(siteKey) && !turnstileToken)} type="submit">
            <Send data-icon="inline-start" />
            Send OTP
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
