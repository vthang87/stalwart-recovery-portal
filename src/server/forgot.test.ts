import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { recoveryAccounts, openDatabase, type AppDatabase } from "@/server/db";
import { resetEnvForTests } from "@/server/env";
import { FORGOT_MESSAGE } from "@/server/http";
import type { Mailer } from "@/server/mailer";
import { requestForgot, type PortalDeps } from "@/server/portal";
import type { Principal } from "@/server/stalwart";

const users = new Map<string, Principal>([
  ["known@example.com", { id: "p-known", email: "known@example.com", name: "known" }],
  ["fresh@example.com", { id: "p-fresh", email: "fresh@example.com", name: "fresh" }],
]);

function mailer(): Mailer & { sent: string[] } {
  const sent: string[] = [];
  return {
    sent,
    async sendOtp(to) {
      sent.push(to);
    },
    async verify() {},
    async sendTest() {},
  };
}

function deps(db: AppDatabase, messages = mailer(), failSend = false): PortalDeps & { mail: ReturnType<typeof mailer> } {
  const mail = failSend
    ? { ...messages, sendOtp: async () => { throw new Error("smtp down"); } }
    : messages;
  return {
    db,
    mailer: mail,
    mail,
    now: () => 1_700_000_000_000,
    findUser: async (account) => users.get(account.toLowerCase()) ?? null,
    searchUsers: async () => [],
    authenticate: async () => ({ status: "invalid" }),
    changeOwnPassword: async () => {},
    resetPassword: async () => {},
  };
}

describe("forgot password enumeration", () => {
  let db: AppDatabase;

  beforeEach(() => {
    process.env.SESSION_SECRET = "test-pepper";
    process.env.OTP_RESEND_COOLDOWN_SECONDS = "0";
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
    db.insert(recoveryAccounts)
      .values({
        principalId: "p-fresh",
        accountEmail: "fresh@example.com",
        recoveryEmail: "backup2@example.com",
        verifiedAt: null,
        createdAt: 10,
        updatedAt: 10,
      })
      .run();
  });

  it("returns the same message for missing, unverified, and verified accounts", async () => {
    const verified = deps(db);
    const a = await requestForgot(verified, { account: "missing@example.com", ip: "1.1.1.1", userAgent: "t" });
    const b = await requestForgot(deps(db), { account: "fresh@example.com", ip: "1.1.1.1", userAgent: "t" });
    const c = await requestForgot(verified, { account: "known@example.com", ip: "1.1.1.2", userAgent: "t" });
    expect(a).toEqual({ message: FORGOT_MESSAGE });
    expect(b).toEqual(a);
    expect(c).toEqual(a);
    expect(verified.mail.sent).toEqual(["backup@example.com"]);
    expect(db.select().from(recoveryAccounts).where(eq(recoveryAccounts.principalId, "p-known")).get()?.verifiedAt).toBe(10);
  });

  it("stays generic when SMTP fails", async () => {
    const portal = deps(db, mailer(), true);
    const result = await requestForgot(portal, { account: "known@example.com", ip: "8.8.8.8", userAgent: "t" });
    expect(result).toEqual({ message: FORGOT_MESSAGE });
  });
});
