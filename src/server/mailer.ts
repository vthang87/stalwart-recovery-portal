import nodemailer from "nodemailer";
import { getEnv } from "@/server/env";
import { AppError } from "@/server/http";

export type Mailer = {
  sendOtp: (to: string, code: string) => Promise<void>;
  sendResetLink: (to: string, accountEmail: string, url: string, expiresMinutes: number) => Promise<void>;
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
    async sendResetLink(to, accountEmail, url, expiresMinutes) {
      await transport().sendMail({
        from: fromAddress(),
        to,
        subject: `Reset password for ${accountEmail}`,
        text: [
          `An administrator requested a password reset for ${accountEmail}.`,
          "",
          `Open this link to choose a new password. It expires in ${expiresMinutes} minutes and works once:`,
          url,
          "",
          "If you did not expect this, you can ignore this email.",
        ].join("\n"),
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

function redactSecrets(message: string) {
  const password = getEnv().smtp.password;
  if (!password) return message;
  return message.replaceAll(password, "[redacted]");
}

export function mailError(err: unknown) {
  const raw = redactSecrets(err instanceof Error ? err.message : "Could not send mail.");
  const { host, port } = getEnv().smtp;
  const target = `${host}:${port}`;
  if (/ECONNREFUSED/i.test(raw)) return `Could not connect to the SMTP server at ${target}. The connection was refused.`;
  if (/ETIMEDOUT|ESOCKET|timed out/i.test(raw)) return `Could not connect to the SMTP server at ${target}. The connection timed out.`;
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(raw)) return `Could not resolve the SMTP host ${host}.`;
  if (/\b(535|534)\b|invalid login|authentication failed|auth failed/i.test(raw)) return "The SMTP server rejected the username or password.";
  return raw;
}

export function smtpFailure(err: unknown): AppError {
  return new AppError(502, mailError(err));
}
