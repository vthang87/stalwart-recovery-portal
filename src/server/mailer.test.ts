import { beforeEach, describe, expect, it } from "vitest";
import { resetEnvForTests } from "@/server/env";
import { mailError } from "@/server/mailer";

describe("mail errors", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-pepper";
    process.env.SMTP_HOST = "mail.example.com";
    process.env.SMTP_PORT = "587";
    resetEnvForTests();
  });

  it("keeps a connection error readable when the SMTP password is empty", () => {
    process.env.SMTP_PASSWORD = "";
    resetEnvForTests();
    const message = mailError(new Error("connect ECONNREFUSED 127.0.0.1:587"));
    expect(message).toBe("Could not connect to the SMTP server at mail.example.com:587. The connection was refused.");
    expect(message).not.toContain("[redacted]");
  });

  it("hides the SMTP password and reports a rejected login", () => {
    process.env.SMTP_PASSWORD = "super-secret-pass";
    resetEnvForTests();
    const message = mailError(new Error("535 authentication failed for super-secret-pass"));
    expect(message).toBe("The SMTP server rejected the username or password.");
    expect(message).not.toContain("super-secret-pass");
  });

  it("redacts the password inside other SMTP errors", () => {
    process.env.SMTP_PASSWORD = "super-secret-pass";
    resetEnvForTests();
    const message = mailError(new Error("greeting failed: super-secret-pass"));
    expect(message).toBe("greeting failed: [redacted]");
  });
});
