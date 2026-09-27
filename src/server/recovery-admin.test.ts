import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type AppDatabase } from "@/server/db";
import { resetEnvForTests } from "@/server/env";
import type { Mailer } from "@/server/mailer";
import { upsertRecoveryEmail, type PortalDeps } from "@/server/portal";

function deps(db: AppDatabase): PortalDeps {
  const mailer: Mailer = { async sendOtp() {}, async verify() {}, async sendTest() {} };
  return {
    db,
    mailer,
    now: () => 1_700_000_000_000,
    findUser: async () => null,
    searchUsers: async () => [],
    authenticate: async () => ({ status: "invalid" }),
    changeOwnPassword: async () => {},
    resetPassword: async () => {},
  };
}

const input = {
  principalId: "p1",
  accountEmail: "user@example.com",
  recoveryEmail: "backup@example.com",
  actorPrincipalId: "admin",
  ip: "127.0.0.1",
  userAgent: "test",
};

describe("admin recovery email", () => {
  let db: AppDatabase;

  beforeEach(() => {
    process.env.SESSION_SECRET = "test-pepper";
    resetEnvForTests();
    db = openDatabase(":memory:");
  });

  it("marks an admin-set address verified without a confirmation code", () => {
    const row = upsertRecoveryEmail(deps(db), { ...input, markVerified: true });
    expect(row?.verifiedAt).toBe(1_700_000_000_000);
  });

  it("leaves a self-service address unverified until the code is confirmed", () => {
    const row = upsertRecoveryEmail(deps(db), input);
    expect(row?.verifiedAt).toBeNull();
  });
});
