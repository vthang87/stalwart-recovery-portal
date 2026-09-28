import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export function generateOtp(length = 6): string {
  const max = 10 ** length;
  return randomInt(0, max).toString().padStart(length, "0");
}

export function hashOtp(otp: string, challengeId: string, pepper: string): string {
  return createHmac("sha256", pepper).update(`${challengeId}:${otp}`).digest("hex");
}

export function otpMatches(otp: string, challengeId: string, pepper: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashOtp(otp, challengeId, pepper));
  const expected = Buffer.from(expectedHash);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function newId(): string {
  return randomBytes(16).toString("hex");
}

export function generateResetSecret(): string {
  return randomBytes(32).toString("base64url");
}
