"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, KeyRound, Plus, Save, Search, Send, UserPlus } from "lucide-react";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { appPath } from "@/lib/base-path";
import { localeChoices, localeOptionText } from "@/lib/locales";
import { postJson } from "@/lib/client";

type Domain = { id: string; name: string };
type Account = {
  id: string;
  email: string;
  name: string;
  description: string;
  locale: string;
  domainId: string;
  recoveryEmail: string;
};

const fieldClass = "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const PAGE_SIZE = 10;

export function AdminAccounts({ csrf, minLength }: { csrf: string; minLength: number }) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Account[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selected, setSelected] = useState<Account | null>(null);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [locale, setLocale] = useState("en-US");
  const [domainId, setDomainId] = useState("");
  const [backupEmail, setBackupEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  const filtered = rows.filter((row) => !domainFilter || row.domainId === domainFilter);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  function domainLabel(id: string) {
    return domains.find((domain) => domain.id === id)?.name || "";
  }

  async function load(nextQuery = query) {
    const res = await fetch(appPath(`/api/admin/accounts?q=${encodeURIComponent(nextQuery)}`), {
      headers: { "x-csrf-token": csrf },
      cache: "no-store",
    });
    const data = (await res.json()) as { accounts?: Account[]; domains?: Domain[]; error?: string };
    if (!res.ok) throw new Error(data.error || "Could not load accounts");
    setRows(data.accounts || []);
    setDomains(data.domains || []);
    return data;
  }

  useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        const res = await fetch(appPath("/api/admin/accounts?q="), {
          headers: { "x-csrf-token": csrf },
          cache: "no-store",
        });
        const data = (await res.json()) as { accounts?: Account[]; domains?: Domain[]; error?: string };
        if (!res.ok) throw new Error(data.error || "Could not load accounts");
        if (cancel) return;
        setRows(data.accounts || []);
        setDomains(data.domains || []);
      } catch (err) {
        if (!cancel) setError(err instanceof Error ? err.message : "Could not load accounts");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [csrf]);

  function fill(account: Account) {
    setCreating(false);
    setSelected(account);
    setName(account.name);
    setDescription(account.description);
    setLocale(account.locale || "en-US");
    setDomainId(account.domainId);
    setBackupEmail(account.recoveryEmail || "");
    setPassword("");
    setConfirm("");
    setFormError("");
    setOpen(true);
  }

  function startCreate() {
    setCreating(true);
    setSelected(null);
    setName("");
    setDescription("");
    setLocale("en-US");
    setDomainId(domains[0]?.id || "");
    setBackupEmail("");
    setPassword("");
    setConfirm("");
    setFormError("");
    setOpen(true);
  }

  function basics() {
    return { name, description, locale, domainId, backupEmail };
  }

  async function runForm(task: () => Promise<void>) {
    setPending(true);
    setFormError("");
    setMessage("");
    try {
      await task();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts</CardTitle>
        <CardDescription>Create a mailbox, update its name, full name, and domain, or set a new password.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Notice error={error} message={message} />
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(0);
            setPending(true);
            setLoading(true);
            setError("");
            setMessage("");
            void load(query)
              .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load accounts"))
              .finally(() => {
                setPending(false);
                setLoading(false);
              });
          }}
        >
          <Label htmlFor="q" className="sr-only">
            Find account
          </Label>
          <Input id="q" className="min-w-48 flex-1" value={query} placeholder="Find account" onChange={(event) => setQuery(event.target.value)} />
          <Label htmlFor="domain-filter" className="sr-only">
            Domain
          </Label>
          <select
            id="domain-filter"
            className="h-8 min-w-40 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={domainFilter}
            onChange={(event) => {
              setDomainFilter(event.target.value);
              setPage(0);
            }}
          >
            <option value="">All domains</option>
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={pending || loading}>
            <Search data-icon="inline-start" />
            Search
          </Button>
          <Button type="button" variant="outline" disabled={pending || loading} onClick={startCreate}>
            <Plus data-icon="inline-start" />
            New
          </Button>
        </form>
        {loading ? <p className="sr-only">Loading accounts</p> : null}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Full name</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Backup email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: PAGE_SIZE }, (_, index) => (
                <TableRow key={index} aria-hidden>
                  <TableCell>
                    <Skeleton className="h-4 w-44" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                </TableRow>
              ))
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                  No accounts.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={open && selected?.id === row.id ? "selected" : undefined}
                  className="cursor-pointer"
                  tabIndex={0}
                  onClick={() => fill(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      fill(row);
                    }
                  }}
                >
                  <TableCell className="font-medium">{row.email}</TableCell>
                  <TableCell>{row.description || "—"}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{domainLabel(row.domainId) || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{row.recoveryEmail || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between gap-3" aria-busy={loading}>
          {loading ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <p className="text-sm text-muted-foreground">
              {filtered.length === 0 ? "0 accounts" : `${currentPage * PAGE_SIZE + 1}–${Math.min(filtered.length, currentPage * PAGE_SIZE + PAGE_SIZE)} of ${filtered.length}`}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={loading || currentPage === 0} onClick={() => setPage(currentPage - 1)}>
              <ChevronLeft data-icon="inline-start" />
              Previous
            </Button>
            {loading ? <Skeleton className="h-4 w-10" /> : <span className="text-sm text-muted-foreground">{currentPage + 1} / {pageCount}</span>}
            <Button type="button" variant="outline" size="sm" disabled={loading || currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>
              Next
              <ChevronRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{creating ? "New account" : selected?.email}</DialogTitle>
            <DialogDescription>
              {creating ? "The mailbox address is the name plus the selected domain." : "Update the mailbox, or set a new password."}
            </DialogDescription>
          </DialogHeader>
          <Notice error={formError} />
          <form
            id="account-form"
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void runForm(async () => {
                if (creating) {
                  if (password !== confirm) throw new Error("Passwords do not match.");
                  const created = (await postJson("/api/admin/accounts", csrf, { ...basics(), password })) as Account;
                  await load("");
                  setOpen(false);
                  setMessage(`Created ${created.email}.`);
                  return;
                }
                if (!selected) return;
                const updated = (await postJson(`/api/admin/accounts/${encodeURIComponent(selected.id)}`, csrf, basics(), "PUT")) as Account;
                setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
                setSelected(updated);
                setOpen(false);
                setMessage("Account updated.");
              });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} autoComplete="off" onChange={(event) => setName(event.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="domain">Domain</Label>
                <select id="domain" className={fieldClass} value={domainId} onChange={(event) => setDomainId(event.target.value)} required>
                  <option value="">Select a domain</option>
                  {domains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Full name</Label>
                <Input id="description" value={description} autoComplete="name" placeholder="Full name" onChange={(event) => setDescription(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="locale">Locale</Label>
                <select id="locale" className={fieldClass} value={locale} onChange={(event) => setLocale(event.target.value)} required>
                  {localeChoices(locale).map((item) => (
                    <option key={item.value} value={item.value}>
                      {localeOptionText(item)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="backup-email">Backup email</Label>
              <Input
                id="backup-email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={backupEmail}
                onChange={(event) => setBackupEmail(event.target.value)}
              />
            </div>
            {creating ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" autoComplete="new-password" minLength={minLength} value={password} onChange={(event) => setPassword(event.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm">Confirm</Label>
                  <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required />
                </div>
              </div>
            ) : null}
          </form>
          {selected && !creating ? (
            <>
              <Separator />
              <form
                className="grid gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void runForm(async () => {
                    if (password !== confirm) throw new Error("Passwords do not match.");
                    await postJson(`/api/admin/accounts/${encodeURIComponent(selected.id)}/password`, csrf, { password });
                    setPassword("");
                    setConfirm("");
                    setOpen(false);
                    setMessage("Password updated on Stalwart.");
                  });
                }}
              >
                <h2 className="text-sm font-medium">Reset password</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="reset">New password</Label>
                    <Input id="reset" type="password" autoComplete="new-password" minLength={minLength} value={password} onChange={(event) => setPassword(event.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reset-confirm">Confirm</Label>
                    <Input id="reset-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required />
                  </div>
                </div>
                <Button type="submit" variant="outline" className="w-fit" disabled={pending}>
                  <KeyRound data-icon="inline-start" />
                  Reset password
                </Button>
              </form>
              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-fit"
                  disabled={pending || !selected.recoveryEmail}
                  onClick={() => {
                    const account = selected;
                    void runForm(async () => {
                      const data = await postJson(`/api/admin/accounts/${encodeURIComponent(account.id)}/reset-link`, csrf);
                      setOpen(false);
                      setMessage(data.message || "Reset link sent.");
                    });
                  }}
                >
                  <Send data-icon="inline-start" />
                  Send reset link
                </Button>
                <p className="text-sm text-muted-foreground">
                  {selected.recoveryEmail
                    ? `Emails a one-time link to ${selected.recoveryEmail}.`
                    : "Save a backup email before sending a reset link."}
                </p>
              </div>
            </>
          ) : null}
          <DialogFooter>
            <Button type="submit" form="account-form" disabled={pending}>
              {creating ? <UserPlus data-icon="inline-start" /> : <Save data-icon="inline-start" />}
              {creating ? "Create account" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
