import { LoginForm } from "@/components/login-form";
import { publicTurnstileSiteKey } from "@/server/turnstile";

export default function LoginPage() {
  return <LoginForm siteKey={publicTurnstileSiteKey()} />;
}
