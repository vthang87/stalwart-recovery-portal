import { PasswordForm } from "@/components/password-form";
import { requireSession } from "@/server/session";

export default async function PasswordPage() {
  const session = await requireSession();
  return <PasswordForm csrf={session.csrf} />;
}
