import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasRecoveryAdminAccess } from "@/server/authz";
import { getEnv } from "@/server/env";
import { AppError } from "@/server/http";

export const SESSION_COOKIE = "srp_session";
export const CSRF_COOKIE = "srp_csrf";
export const RESET_COOKIE = "srp_reset";

export type Session = {
  principalId: string;
  email: string;
  permissions: string[];
  csrf: string;
  exp: number;
};

export type ResetGrant = {
  challengeId: string;
  principalId: string;
  exp: number;
};

type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
};

function key() {
  return scryptSync(getEnv().sessionSecret, "stalwart-recovery-portal", 32);
}

export function seal(payload: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload));
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function open<T>(token: string): T | null {
  try {
    const raw = Buffer.from(token, "base64url");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(plaintext.toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function tokensMatch(a: string, b: string) {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

export function cookieBase(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: getEnv().appUrl.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export async function readCookie(name: string) {
  const jar = await cookies();
  return jar.get(name)?.value;
}

export async function getSession(): Promise<Session | null> {
  const raw = await readCookie(SESSION_COOKIE);
  if (!raw) return null;
  const session = open<Session>(raw);
  if (!session || session.exp < Date.now()) return null;
  return session;
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdminSession(): Promise<Session> {
  const session = await requireSession();
  if (!hasRecoveryAdminAccess(session.permissions)) redirect("/account");
  return session;
}

export function assertCsrf(expected: string, req: Request) {
  const header = req.headers.get("x-csrf-token") || "";
  if (!header || !tokensMatch(header, expected)) throw new AppError(403, "CSRF không hợp lệ");
}

export function newCsrf() {
  return randomBytes(24).toString("base64url");
}
