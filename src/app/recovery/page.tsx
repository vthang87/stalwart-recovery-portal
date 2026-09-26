import { RecoveryForm } from "@/components/recovery-form";
import { getDb } from "@/server/db";
import { getRecovery } from "@/server/portal";
import { requireSession } from "@/server/session";

export default async function RecoveryPage() {
  const session = await requireSession();
  const row = getRecovery(getDb(), session.principalId);
  return <RecoveryForm csrf={session.csrf} initialEmail={row?.recoveryEmail || ""} verified={Boolean(row?.verifiedAt)} />;
}
