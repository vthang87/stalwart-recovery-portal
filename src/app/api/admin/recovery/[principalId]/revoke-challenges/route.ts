import { NextResponse } from "next/server";
import { writeAudit } from "@/server/audit";
import { revokeChallenges } from "@/server/portal";
import { deps, handle, meta, requireAdmin } from "@/server/route";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ principalId: string }> }) {
  return handle(async () => {
    const session = await requireAdmin(req);
    const { principalId } = await ctx.params;
    const portal = deps();
    revokeChallenges(portal, principalId);
    const info = meta(req);
    writeAudit(portal.db, {
      principalId,
      actorPrincipalId: session.principalId,
      action: "challenge_revoked",
      result: "ok",
      ip: info.ip,
      userAgent: info.userAgent,
      now: Date.now(),
    });
    return NextResponse.json({ ok: true });
  });
}
