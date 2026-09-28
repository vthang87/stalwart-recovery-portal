import { ResetForm } from "@/components/reset-form";
import { getEnv } from "@/server/env";
import { publicTurnstileSiteKey } from "@/server/turnstile";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <ResetForm siteKey={publicTurnstileSiteKey()} minLength={getEnv().passwordMinLength} token={token || ""} />;
}
