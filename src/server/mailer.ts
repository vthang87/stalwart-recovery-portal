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
        subject: "Account recovery code",
        text: `Your OTP is ${code}. It expires in ${env.otpTtlMinutes} minutes and can only be used once.`,
      });
    },
    async verify() {
      await transport().verify();
    },
    async sendTest(to) {
      await transport().sendMail({
        from: fromAddress(),
        to,
        subject: "Recovery SMTP test",
        text: "The noreply SMTP connection is working.",
      });
    },
  };
}

export function mailError(err: unknown) {
  const message = err instanceof Error ? err.message : "SMTP error";
  const env = getEnv();
  return message.replaceAll(env.smtp.password, "[redacted]");
}

export function smtpFailure(err: unknown): AppError {
  return new AppError(502, `SMTP error: ${mailError(err)}`);
}
