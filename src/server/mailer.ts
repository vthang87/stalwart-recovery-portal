import nodemailer from "nodemailer";
import { getEnv } from "@/server/env";
import { AppError } from "@/server/http";

export type Mailer = {
  sendOtp: (to: string, code: string) => Promise<void>;
  verify: () => Promise<void>;
  sendTest: (to: string) => Promise<void>;
};

function transport() {
  const env = getEnv();
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
    requireTLS: env.smtp.starttls && !env.smtp.secure,
  });
}

function fromAddress() {
  const env = getEnv();
  return `"${env.mailFromName.replaceAll('"', "")}" <${env.mailFromAddress}>`;
}

export function createMailer(): Mailer {
  return {
    async sendOtp(to, code) {
      const env = getEnv();
      await transport().sendMail({
        from: fromAddress(),
        to,
        subject: "Mã khôi phục tài khoản",
        text: `Mã OTP của bạn là ${code}. Mã hết hạn sau ${env.otpTtlMinutes} phút và chỉ dùng một lần.`,
      });
    },
    async verify() {
      await transport().verify();
    },
    async sendTest(to) {
      await transport().sendMail({
        from: fromAddress(),
        to,
        subject: "Thư kiểm tra khôi phục",
        text: "Kết nối SMTP noreply đang hoạt động.",
      });
    },
  };
}

export function mailError(err: unknown) {
  const message = err instanceof Error ? err.message : "SMTP lỗi";
  const env = getEnv();
  return message.replaceAll(env.smtp.password, "[redacted]");
}

export function smtpFailure(err: unknown): AppError {
  return new AppError(502, `SMTP lỗi: ${mailError(err)}`);
}
