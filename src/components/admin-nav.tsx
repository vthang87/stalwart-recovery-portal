import Link from "next/link";

export function AdminNav() {
  return (
    <nav className="subnav">
      <Link href="/admin/recovery">Recovery</Link>
      <Link href="/admin/audit">Audit log</Link>
      <Link href="/admin/settings">SMTP</Link>
    </nav>
  );
}
