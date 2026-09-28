"use client";

import { useState } from "react";
import { PlugZap, Send } from "lucide-react";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJson } from "@/lib/client";

export function SmtpSettings({ csrf }: { csrf: string }) {
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function run(task: () => Promise<void>) {
    setPending(true);
    setError("");
    setMessage("");
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : "SMTP error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMTP</CardTitle>
        <CardDescription>Check the noreply SMTP connection. SMTP errors do not stop the process.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Notice error={error} message={message} />
        <Button
          type="button"
          className="w-fit"
          disabled={pending}
          onClick={() =>
            void run(async () => {
              await postJson("/api/admin/smtp/test", csrf, {});
              setMessage("SMTP connection succeeded.");
            })
          }
        >
          <PlugZap data-icon="inline-start" />
          Test connection
        </Button>
        <div className="grid gap-2">
          <Label htmlFor="to">Send test email to</Label>
          <Input id="to" type="email" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button
          variant="outline"
          type="button"
          className="w-fit"
          disabled={pending || !to}
          onClick={() =>
            void run(async () => {
              await postJson("/api/admin/smtp/test", csrf, { to });
              setMessage("Test email sent.");
            })
          }
        >
          <Send data-icon="inline-start" />
          Send test email
        </Button>
      </CardContent>
    </Card>
  );
}
