import Link from "next/link";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasRecoveryAdminAccess } from "@/server/authz";
import { getDb } from "@/server/db";
import { getRecovery } from "@/server/portal";
import { getSession } from "@/server/session";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const row = getRecovery(getDb(), session.principalId);
  const verified = Boolean(row?.verifiedAt);
  const tiles = [
    {
      href: "/recovery",
      title: "Recovery email",
      body: "Add, change, and verify the address that receives OTPs.",
      icon: Mail,
    },
    {
      href: "/password",
      title: "Change password",
      body: "Update the mailbox password on Stalwart.",
      icon: KeyRound,
    },
    ...(hasRecoveryAdminAccess(session.permissions)
      ? [
          {
            href: "/admin/recovery",
            title: "Recovery admin",
            body: "Recovery workflow only — not full mail administration.",
            icon: ShieldCheck,
          },
        ]
      : []),
  ];

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-lg font-medium">Account</h1>
        <p className="text-sm text-muted-foreground">{session.email}</p>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span>Recovery email: {row?.recoveryEmail || "not set"}</span>
          {row?.recoveryEmail ? <Badge variant={verified ? "secondary" : "outline"}>{verified ? "Verified" : "Unverified"}</Badge> : null}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link key={tile.href} href={tile.href} className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50">
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardHeader>
                  <Icon className="size-4 text-muted-foreground" />
                  <CardTitle>{tile.title}</CardTitle>
                  <CardDescription>{tile.body}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
