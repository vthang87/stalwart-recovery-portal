import { NextResponse } from "next/server";
import { writeAudit } from "@/server/audit";
import { getDb } from "@/server/db";
import { RESET_COOKIE, SESSION_COOKIE, clearCookie, getSession, handle, meta } from "@/server/route";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const session = await getSession();
    if (session) {
      const info = meta(req);
      writeAudit(getDb(), {
        principalId: session.principalId,
        actorPrincipalId: session.principalId,
        action: "logout",
        result: "ok",
        ip: info.ip,
        userAgent: info.userAgent,
        now: Date.now(),
      });
    }
    await clearCookie(SESSION_COOKIE);
    await clearCookie(RESET_COOKIE);
    return NextResponse.json({ ok: true });
  });
}
