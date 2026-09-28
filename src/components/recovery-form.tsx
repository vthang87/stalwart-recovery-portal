"use client";

import { useState } from "react";
import { MailCheck, Save, Send } from "lucide-react";
import { Notice } from "@/components/notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJson } from "@/lib/client";

export function RecoveryForm({
  csrf,
  initialEmail,
  verified,
}: {
  csrf: string;
  initialEmail: string;
  verified: boolean;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [isVerified, setVerified] = useState(verified);

  async function run(task: () => Promise<void>) {
    setPending(true);
    setError("");
    setMessage("");
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle>Recovery email</CardTitle>
        <CardDescription>Unverified addresses cannot be used to reset the password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await postJson("/api/me/recovery", csrf, { recoveryEmail: email }, "PUT");
              setVerified(false);
              setMessage("Email saved. Send a verification code.");
            });
          }}
        >
          <Notice error={error} message={message} />
          <Badge variant={isVerified ? "secondary" : "outline"} className="w-fit">
            {isVerified ? "Verified" : "Unverified"}
          </Badge>
          <div className="grid gap-2">
            <Label htmlFor="recovery">Recovery email</Label>
            <Input id="recovery" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending} type="submit">
              <Save data-icon="inline-start" />
              Save
            </Button>
            <Button
              variant="outline"
              type="button"
              disabled={pending}
              onClick={() =>
                void run(async () => {
                  await postJson("/api/me/recovery", csrf, { recoveryEmail: email }, "PUT");
                  await postJson("/api/me/recovery/send-verification", csrf);
                  setMessage("OTP sent to the recovery email.");
                })
              }
            >
              <Send data-icon="inline-start" />
              Send verification code
            </Button>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="code">OTP</Label>
            <Input id="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <Button
            type="button"
            disabled={pending || !code}
            onClick={() =>
              void run(async () => {
                await postJson("/api/me/recovery/verify", csrf, { code });
                setVerified(true);
                setMessage("Recovery email verified.");
              })
            }
          >
            <MailCheck data-icon="inline-start" />
            Verify
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
