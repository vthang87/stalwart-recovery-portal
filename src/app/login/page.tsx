import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/server/session";
import { publicTurnstileSiteKey } from "@/server/turnstile";

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  return <LoginForm siteKey={publicTurnstileSiteKey()} />;
}
