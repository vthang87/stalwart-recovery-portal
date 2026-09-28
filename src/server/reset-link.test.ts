import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase, recoveryAccounts, resetChallenges, type AppDatabase } from "@/server/db";
import { resetEnvForTests } from "@/server/env";
import type { Mailer } from "@/server/mailer";
import { completeResetFromLink, sendAdminResetLink, type PortalDeps } from "@/server/portal";

const now = 1_700_000_000_000;

function harness(db: AppDatabase) {
  const sent: { to: string; accountEmail: string; url: string; expiresMinutes: number }[] = [];
  const resets: { principalId: string; password: string }[] = [];
  const mailer: Mailer = {
    async sendOtp() {},
    async sendResetLink(to, accountEmail, url, expiresMinutes) {
      sent.push({ to, accountEmail, url, expiresMinutes });
    },
    async verify() {},
    async sendTest() {},
  };
  const deps: PortalDeps = {
    db,
    mailer,
    now: () => now,
    findUser: async () => null,
    searchUsers: async () => [],
    authenticate: async () => ({ status: "invalid" }),
    changeOwnPassword: async () => {},
    resetPassword: async (principalId, password) => {
      resets.push({ principalId, password });
    },
  };
  return { deps, sent, resets };
}

describe("admin reset link", () => {
  let db: AppDatabase;

  beforeEach(() => {
    process.env.SESSION_SECRET = "test-pepper";
    process.env.APP_URL = "https://mail.example.com";
    process.env.BASE_PATH = "/account";
    process.env.OTP_RESEND_COOLDOWN_SECONDS = "0";
    process.env.PASSWORD_MIN_LENGTH = "8";
    resetEnvForTests();
    db = openDatabase(":memory:");
    db.insert(recoveryAccounts)
      .values({
        principalId: "p-known",
        accountEmail: "known@example.com",
        recoveryEmail: "backup@example.com",
        verifiedAt: 10,
        createdAt: 10,
        updatedAt: 10,
      })
      .run();
  });

  it("emails a one-time link and rejects a second use", async () => {
    const { deps, sent, resets } = harness(db);
    const result = await sendAdminResetLink(deps, {
      principalId: "p-known",
      actorPrincipalId: "admin",
      ip: "1.1.1.1",
      userAgent: "t",
    });
    expect(result.sentTo).toBe("backup@example.com");
    expect(sent[0]?.accountEmail).toBe("known@example.com");
    expect(sent[0]?.expiresMinutes).toBe(60);
    const url = new URL(sent[0]?.url || "");
    expect(url.origin + url.pathname).toBe("https://mail.example.com/account/reset-password");
    const token = url.searchParams.get("token") || "";
    const row = db.select().from(resetChallenges).where(eq(resetChallenges.purpose, "reset-link")).get();
    expect(row?.secretHash).toBeTruthy();
    expect(row?.secretHash).not.toContain(token);
    await completeResetFromLink(deps, { token, password: "new-password", ip: "2.2.2.2", userAgent: "u" });
    expect(resets).toEqual([{ principalId: "p-known", password: "new-password" }]);
    await expect(completeResetFromLink(deps, { token, password: "other-password", ip: "3.3.3.3", userAgent: "u" })).rejects.toThrow(
      "This reset link is invalid or expired.",
    );
  });

  it("refuses to send when no verified backup email is saved", async () => {
    db.update(recoveryAccounts).set({ verifiedAt: null }).where(eq(recoveryAccounts.principalId, "p-known")).run();
    const { deps } = harness(db);
    await expect(
      sendAdminResetLink(deps, { principalId: "p-known", actorPrincipalId: "admin", ip: "1.1.1.1", userAgent: "t" }),
    ).rejects.toThrow("Set a backup email before sending a reset link.");
    await expect(
      sendAdminResetLink(deps, { principalId: "missing", actorPrincipalId: "admin", ip: "1.1.1.1", userAgent: "t" }),
    ).rejects.toThrow("Set a backup email before sending a reset link.");
  });
});
