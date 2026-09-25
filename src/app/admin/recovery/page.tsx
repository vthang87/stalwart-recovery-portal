import { AdminNav } from "@/components/admin-nav";
import { AdminRecovery } from "@/components/admin-recovery";
import { requireAdminSession } from "@/server/session";

export default async function AdminRecoveryPage() {
  const session = await requireAdminSession();
  return (
    <>
      <AdminNav />
      <AdminRecovery csrf={session.csrf} />
    </>
  );
}
