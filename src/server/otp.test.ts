import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { resetChallenges, openDatabase } from "@/server/db";
import { hashOtp, otpMatches } from "@/server/otp";

function consume(db: ReturnType<typeof openDatabase>, input: { id: string; code: string; now: number; maxAttempts: number; pepper: string }) {
  const challenge = db.select().from(resetChallenges).where(eq(resetChallenges.id, input.id)).get();
  if (!challenge || challenge.usedAt || challenge.expiresAt < input.now || challenge.attempts >= input.maxAttempts) {
    return { ok: false };
  }
  if (!otpMatches(input.code, challenge.id, input.pepper, challenge.secretHash)) {
    const attempts = challenge.attempts + 1;
    db.update(resetChallenges)
      .set({ attempts, usedAt: attempts >= input.maxAttempts ? input.now : null })
      .where(eq(resetChallenges.id, challenge.id))
      .run();
    return { ok: false };
  }
  db.update(resetChallenges).set({ usedAt: input.now }).where(eq(resetChallenges.id, challenge.id)).run();
  return { ok: true };
}

describe("otp", () => {
  it("accepts the matching code only", () => {
    const hash = hashOtp("123456", "abc", "pepper");
    expect(otpMatches("123456", "abc", "pepper", hash)).toBe(true);
    expect(otpMatches("000000", "abc", "pepper", hash)).toBe(false);
    expect(otpMatches("123456", "other", "pepper", hash)).toBe(false);
  });

  it("expires, locks attempts, and is one-time", () => {
    const db = openDatabase(":memory:");
    const now = 1_000_000;
    db.insert(resetChallenges)
      .values({
        id: "c1",
        principalId: "p1",
        purpose: "reset",
        secretHash: hashOtp("111111", "c1", "pepper"),
        expiresAt: now + 1000,
        attempts: 0,
        createdAt: now,
      })
      .run();

    for (let i = 0; i < 5; i += 1) {
      expect(consume(db, { id: "c1", code: "000000", now, maxAttempts: 5, pepper: "pepper" }).ok).toBe(false);
    }
    expect(consume(db, { id: "c1", code: "111111", now, maxAttempts: 5, pepper: "pepper" }).ok).toBe(false);
    expect(db.select().from(resetChallenges).where(eq(resetChallenges.id, "c1")).get()?.usedAt).toBeTruthy();

    db.insert(resetChallenges)
      .values({
        id: "c2",
        principalId: "p1",
        purpose: "reset",
        secretHash: hashOtp("222222", "c2", "pepper"),
        expiresAt: now - 1,
        attempts: 0,
        createdAt: now - 10,
      })
      .run();
    expect(consume(db, { id: "c2", code: "222222", now, maxAttempts: 5, pepper: "pepper" }).ok).toBe(false);

    db.insert(resetChallenges)
      .values({
        id: "c3",
        principalId: "p1",
        purpose: "enroll",
        secretHash: hashOtp("333333", "c3", "pepper"),
        expiresAt: now + 5000,
        attempts: 0,
        createdAt: now,
      })
      .run();
    expect(consume(db, { id: "c3", code: "333333", now, maxAttempts: 5, pepper: "pepper" }).ok).toBe(true);
    expect(consume(db, { id: "c3", code: "333333", now, maxAttempts: 5, pepper: "pepper" }).ok).toBe(false);
  });
});
