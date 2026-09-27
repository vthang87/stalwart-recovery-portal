import { ResetForm } from "@/components/reset-form";
import { publicTurnstileSiteKey } from "@/server/turnstile";

export default function ResetPage() {
  return <ResetForm siteKey={publicTurnstileSiteKey()} />;
}
