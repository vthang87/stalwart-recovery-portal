import { ResetForm } from "@/components/reset-form";
import { getEnv } from "@/server/env";
import { publicTurnstileSiteKey } from "@/server/turnstile";

export default function ResetPage() {
  return <ResetForm siteKey={publicTurnstileSiteKey()} minLength={getEnv().passwordMinLength} />;
}
