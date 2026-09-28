"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJson } from "@/lib/client";

export function PasswordForm({ csrf, minLength }: { csrf: string; minLength: number }) {
  const [currentPassword, setCurrent] = useState("");
  const [nextPassword, setNext] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    try {
      await postJson("/api/password/change", csrf, { currentPassword, nextPassword });
      setMessage("Password updated on Stalwart.");
      setCurrent("");
      setNext("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>The new password is written directly to Stalwart and is not stored in this portal.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <Notice error={error} message={message} />
          <div className="grid gap-2">
            <Label htmlFor="current">Current password</Label>
            <Input id="current" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="next">New password</Label>
            <Input id="next" type="password" autoComplete="new-password" value={nextPassword} onChange={(e) => setNext(e.target.value)} required minLength={minLength} />
          </div>
          <Button disabled={pending} type="submit">
            <KeyRound data-icon="inline-start" />
            {pending ? "Updating…" : "Change password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
