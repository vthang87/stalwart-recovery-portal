import { NextResponse } from "next/server";
import { hasRecoveryAdminAccess } from "@/server/authz";
import { getEnv } from "@/server/env";
import { CSRF_COOKIE, getSession, handle, newCsrf, seal, setCookie } from "@/server/route";

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
    const csrf = newCsrf();
    await setCookie(CSRF_COOKIE, seal({ csrf, exp: Date.now() + 60 * 60 * 1000 }), 60 * 60);
    return NextResponse.json({ authenticated: false, csrf, appName: getEnv().appName });
  });
}
