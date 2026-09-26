import Link from "next/link";

export function AdminNav() {
  return (
    <nav className="subnav">
      <Link href="/admin/recovery">Khôi phục</Link>
      <Link href="/admin/audit">Nhật ký</Link>
      <Link href="/admin/settings">SMTP</Link>
    </nav>
  );
}
