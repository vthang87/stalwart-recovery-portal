import { normalizeBasePath } from "@/lib/base-path";

export type Env = {
  appName: string;
  appUrl: string;
  basePath: string;
  port: number;
  dataDir: string;
  sessionSecret: string;
  stalwartUrl: string;
  stalwartApiToken: string;
  stalwartOAuthClientId: string;
  adminPermissions: string[];
  otpLength: number;
  otpTtlMinutes: number;
  otpMaxAttempts: number;
  otpResendCooldownSeconds: number;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    starttls: boolean;
    user: string;
    password: string;
  };
  mailFromName: string;
  mailFromAddress: string;
};

let cached: Env | null = null;

function num(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: string | undefined, fallback: boolean) {
  if (value == null || value === "") return fallback;
  return value === "true" || value === "1";
}

export function getEnv(): Env {
  if (cached) return cached;
  const sessionSecret = process.env.SESSION_SECRET || "dev-only-session-secret-change-me";
  if (process.env.NODE_ENV === "production" && sessionSecret === "dev-only-session-secret-change-me") {
    throw new Error("SESSION_SECRET is required in production");
  }
  cached = {
    appName: process.env.APP_NAME || "Stalwart Recovery Portal",
    appUrl: (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, ""),
    basePath: normalizeBasePath(process.env.BASE_PATH),
    port: num(process.env.PORT, 3000),
    dataDir: process.env.DATA_DIR || "./data",
    sessionSecret,
    stalwartUrl: (process.env.STALWART_URL || "http://stalwart:8080").replace(/\/$/, ""),
    stalwartApiToken: process.env.STALWART_API_TOKEN || "",
    stalwartOAuthClientId: process.env.STALWART_OAUTH_CLIENT_ID || "stalwart-recovery-portal",
    adminPermissions: (process.env.RECOVERY_ADMIN_PERMISSIONS || "sysAccountQuery")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    otpLength: num(process.env.OTP_LENGTH, 6),
    otpTtlMinutes: num(process.env.OTP_TTL_MINUTES, 15),
    otpMaxAttempts: num(process.env.OTP_MAX_ATTEMPTS, 5),
    otpResendCooldownSeconds: num(process.env.OTP_RESEND_COOLDOWN_SECONDS, 60),
    smtp: {
      host: process.env.SMTP_HOST || "stalwart",
      port: num(process.env.SMTP_PORT, 587),
      secure: bool(process.env.SMTP_SECURE, false),
      starttls: bool(process.env.SMTP_STARTTLS, true),
      user: process.env.SMTP_USER || "",
      password: process.env.SMTP_PASSWORD || "",
    },
    mailFromName: process.env.MAIL_FROM_NAME || "Mail Recovery",
    mailFromAddress: process.env.MAIL_FROM_ADDRESS || "noreply@domain.com",
  };
  return cached;
}

export function resetEnvForTests() {
  cached = null;
}
