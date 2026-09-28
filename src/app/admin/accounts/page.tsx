import { AdminAccounts } from "@/components/admin-accounts";
import { AdminNav } from "@/components/admin-nav";
import { getEnv } from "@/server/env";
import { requireAdminSession } from "@/server/session";

export default async function AccountsPage() {
  const session = await requireAdminSession();
  return (
    <>
      <AdminNav />
      <AdminAccounts csrf={session.csrf} minLength={getEnv().passwordMinLength} />
    </>
  );
}
