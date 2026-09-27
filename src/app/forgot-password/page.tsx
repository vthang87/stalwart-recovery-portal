import { ForgotForm } from "@/components/forgot-form";
import { publicTurnstileSiteKey } from "@/server/turnstile";

export default function ForgotPage() {
  return <ForgotForm siteKey={publicTurnstileSiteKey()} />;
}
