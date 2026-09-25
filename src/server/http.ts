export const FORGOT_MESSAGE =
  "Nếu tài khoản có email khôi phục đã xác minh, chúng tôi đã gửi mã OTP.";

export const OTP_INVALID_MESSAGE = "Mã OTP không hợp lệ hoặc đã hết hạn.";

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
  if (password.length < 12) return "Mật khẩu mới cần ít nhất 12 ký tự.";
  if (password.length > 256) return "Mật khẩu quá dài.";
  return null;
}

export function clientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}
