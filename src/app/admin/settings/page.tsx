import { AdminNav } from "@/components/admin-nav";
import { SmtpSettings } from "@/components/smtp-settings";
import { requireAdminSession } from "@/server/session";

export default async function SettingsPage() {
  const session = await requireAdminSession();
  return (
    <>
      <AdminNav />
      <SmtpSettings csrf={session.csrf} />
    </>
  );
}
