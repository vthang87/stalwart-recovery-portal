export const FORGOT_MESSAGE =
  "If this account has a verified recovery email, we sent an OTP.";

export const OTP_INVALID_MESSAGE = "Invalid or expired OTP.";

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function logError(event: string, err: unknown) {
  const message = err instanceof Error ? err.message : "unknown";
  console.error(JSON.stringify({ event, message }));
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateNewPassword(password: string): string | null {
  if (password.length < 12) return "New password must be at least 12 characters.";
  if (password.length > 256) return "Password is too long.";
  return null;
}

export function clientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}
