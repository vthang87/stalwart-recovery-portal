"use client";

import { useState } from "react";
import { Ban, Save, Search, Send, Trash2 } from "lucide-react";
import { Notice } from "@/components/notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { appPath } from "@/lib/base-path";
import { postJson } from "@/lib/client";

type Principal = {
  id: string;
  email: string;
  name: string;
  recoveryEmail: string | null;
  verified: boolean;
};

export function AdminRecovery({ csrf }: { csrf: string }) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Principal[]>([]);
  const [selected, setSelected] = useState<Principal | null>(null);
  const [email, setEmail] = useState("");
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
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  function search(event?: React.FormEvent) {
    event?.preventDefault();
    void run(async () => {
      const res = await fetch(appPath(`/api/admin/principals/search?q=${encodeURIComponent(query)}`), {
        headers: { "x-csrf-token": csrf },
      });
      const data = (await res.json()) as { principals?: Principal[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Not found");
      setRows(data.principals || []);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recovery admin</CardTitle>
        <CardDescription>Find a Stalwart principal and manage recovery email, verification, and OTP revocation only.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Notice error={error} message={message} />
        <form className="grid gap-2" onSubmit={search}>
          <Label htmlFor="q">Find account</Label>
          <div className="flex gap-2">
            <Input id="q" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Button type="submit" disabled={pending}>
              <Search data-icon="inline-start" />
              Search
            </Button>
          </div>
        </form>
        <div className="grid gap-2">
          {rows.map((row) => (
            <Button
              key={row.id}
              type="button"
              variant={selected?.id === row.id ? "secondary" : "outline"}
              className="h-auto justify-between py-2"
              onClick={() => {
                setSelected(row);
                setEmail(row.recoveryEmail || "");
              }}
            >
              <span>{row.email}</span>
              {row.verified ? <Badge variant="secondary">Verified</Badge> : null}
            </Button>
          ))}
        </div>
        {selected ? (
          <>
            <Separator />
            <div className="grid gap-4">
              <h2 className="text-sm font-medium">{selected.email}</h2>
              <div className="grid gap-2">
                <Label htmlFor="recovery">Recovery email</Label>
                <Input id="recovery" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    void run(async () => {
                      await postJson(
                        `/api/admin/recovery/${encodeURIComponent(selected.id)}`,
                        csrf,
                        { recoveryEmail: email, accountEmail: selected.email },
                        "PUT",
                      );
                      const next = { ...selected, recoveryEmail: email, verified: true };
                      setSelected(next);
                      setRows((current) => current.map((row) => (row.id === selected.id ? next : row)));
                      setMessage("Saved. This address is verified and can receive reset codes.");
                    })
                  }
                >
                  <Save data-icon="inline-start" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    void run(async () => {
                      await postJson(`/api/admin/recovery/${encodeURIComponent(selected.id)}/send-verification`, csrf);
                      setMessage("Verification code resent.");
                    })
                  }
                >
                  <Send data-icon="inline-start" />
                  Send verification
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    void run(async () => {
                      await postJson(`/api/admin/recovery/${encodeURIComponent(selected.id)}/revoke-challenges`, csrf);
                      setMessage("Active codes revoked.");
                    })
                  }
                >
                  <Ban data-icon="inline-start" />
                  Revoke OTP
                </Button>
                <Button
                  variant="destructive"
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    void run(async () => {
                      await postJson(`/api/admin/recovery/${encodeURIComponent(selected.id)}`, csrf, undefined, "DELETE");
                      setEmail("");
                      setMessage("Recovery email removed.");
                    })
                  }
                >
                  <Trash2 data-icon="inline-start" />
                  Remove
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
