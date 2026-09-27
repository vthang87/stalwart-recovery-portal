import { VerifyForm } from "@/components/verify-form";
import { publicTurnstileSiteKey } from "@/server/turnstile";

export default function VerifyPage() {
  return <VerifyForm siteKey={publicTurnstileSiteKey()} />;
}
