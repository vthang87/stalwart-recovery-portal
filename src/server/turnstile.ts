import { getEnv } from "@/server/env";
import { AppError } from "@/server/http";

export type TurnstileMode = "off" | "on" | "misconfigured";

export function turnstileMode(siteKey: string, secretKey: string, nodeEnv = process.env.NODE_ENV): TurnstileMode {
  if (siteKey && secretKey) return "on";
  if (!siteKey && !secretKey && nodeEnv !== "production") return "off";
  return "misconfigured";
}

export function publicTurnstileSiteKey() {
  const env = getEnv();
  return turnstileMode(env.turnstileSiteKey, env.turnstileSecretKey) === "on" ? env.turnstileSiteKey : "";
}

export async function verifyTurnstile(token: string | undefined, ip: string) {
  const env = getEnv();
  const mode = turnstileMode(env.turnstileSiteKey, env.turnstileSecretKey);
  if (mode === "off") return;
  if (mode === "misconfigured") throw new AppError(503, "Cloudflare Turnstile is not configured.");
  if (!token) throw new AppError(400, "Please confirm you are not a robot.");
  let res: Response;
  try {
    res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: env.turnstileSecretKey,
        response: token,
        remoteip: ip,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new AppError(503, "Could not verify Cloudflare Turnstile.");
  }
  const body = (await res.json().catch(() => null)) as { success?: boolean } | null;
  if (!res.ok || !body?.success) throw new AppError(400, "Cloudflare verification failed.");
}
