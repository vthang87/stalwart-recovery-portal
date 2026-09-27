import { NextResponse } from "next/server";
import { hasRecoveryAdminAccess } from "@/server/authz";
import { getEnv } from "@/server/env";
import { CSRF_COOKIE, getSession, handle, newCsrf, open, readCookie, seal, setCookie } from "@/server/route";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const session = await getSession();
    if (session) {
      return NextResponse.json({
        authenticated: true,
        email: session.email,
        principalId: session.principalId,
        isAdmin: hasRecoveryAdminAccess(session.permissions),
        csrf: session.csrf,
        appName: getEnv().appName,
      });
    }
    const existing = await readCookie(CSRF_COOKIE);
    const current = existing ? open<{ csrf: string; exp: number }>(existing) : null;
    const csrf = current && current.exp > Date.now() ? current.csrf : newCsrf();
    const exp = current && current.exp > Date.now() ? current.exp : Date.now() + 60 * 60 * 1000;
    await setCookie(CSRF_COOKIE, seal({ csrf, exp }), Math.max(1, Math.ceil((exp - Date.now()) / 1000)));
    return NextResponse.json({ authenticated: false, csrf, appName: getEnv().appName });
  });
}
