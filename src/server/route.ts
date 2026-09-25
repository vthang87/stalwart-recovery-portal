import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hasRecoveryAdminAccess } from "@/server/authz";
import { getDb } from "@/server/db";
import { AppError, clientIp, logError } from "@/server/http";
import { createMailer } from "@/server/mailer";
import { defaultDeps, type PortalDeps } from "@/server/portal";
import {
  CSRF_COOKIE,
  RESET_COOKIE,
  SESSION_COOKIE,
  assertCsrf,
  cookieBase,
  getSession,
  newCsrf,
  open,
  readCookie,
  seal,
  type ResetGrant,
  type Session,
} from "@/server/session";

export function deps(): PortalDeps {
  return defaultDeps(getDb(), createMailer());
}

export async function handle(fn: () => Promise<NextResponse>) {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.status });
    logError("api", err);
    return NextResponse.json({ error: "Đã có lỗi. Thử lại sau." }, { status: 500 });
  }
}

export async function requireUser(req: Request) {
  const session = await getSession();
  if (!session) throw new AppError(401, "Cần đăng nhập.");
  assertCsrf(session.csrf, req);
  return session;
}

export async function requireAdmin(req: Request) {
  const session = await requireUser(req);
  if (!hasRecoveryAdminAccess(session.permissions)) throw new AppError(403, "Không có quyền quản trị khôi phục.");
  return session;
}

export async function requireAnonymousCsrf(req: Request) {
  const raw = await readCookie(CSRF_COOKIE);
  const token = raw ? open<{ csrf: string; exp: number }>(raw) : null;
  if (!token || token.exp < Date.now()) throw new AppError(403, "CSRF không hợp lệ");
  assertCsrf(token.csrf, req);
  return token.csrf;
}

export async function setCookie(name: string, value: string, maxAge: number) {
  const jar = await cookies();
  jar.set(name, value, cookieBase(maxAge));
}

export async function clearCookie(name: string) {
  const jar = await cookies();
  jar.set(name, "", { ...cookieBase(0), maxAge: 0 });
}

export function sessionToken(session: Omit<Session, "csrf" | "exp"> & { csrf?: string }, ttlMs = 12 * 60 * 60 * 1000) {
  const csrf = session.csrf || newCsrf();
  const exp = Date.now() + ttlMs;
  return { csrf, token: seal({ ...session, csrf, exp }) };
}

export async function readResetGrant(): Promise<ResetGrant | null> {
  const raw = await readCookie(RESET_COOKIE);
  if (!raw) return null;
  const grant = open<ResetGrant>(raw);
  if (!grant || grant.exp < Date.now()) return null;
  return grant;
}

export function meta(req: Request) {
  return { ip: clientIp(req), userAgent: req.headers.get("user-agent") || "" };
}

export { CSRF_COOKIE, RESET_COOKIE, SESSION_COOKIE, getSession, seal, newCsrf };
