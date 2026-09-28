"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, ScrollText, Server, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/admin/accounts", label: "Accounts", icon: Users },
  { href: "/admin/recovery", label: "Recovery", icon: Mail },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  { href: "/admin/settings", label: "SMTP", icon: Server },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-4 flex flex-wrap gap-2">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Button key={link.href} variant={pathname === link.href ? "secondary" : "outline"} size="sm" asChild>
            <Link href={link.href}>
              <Icon data-icon="inline-start" />
              {link.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
