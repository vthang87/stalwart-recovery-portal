import { NextResponse } from "next/server";
import { sendVerification } from "@/server/portal";
import { deps, handle, meta, requireAdmin } from "@/server/route";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ principalId: string }> }) {
  return handle(async () => {
    const session = await requireAdmin(req);
    const { principalId } = await ctx.params;
    await sendVerification(deps(), { principalId, actorPrincipalId: session.principalId, ...meta(req) });
    return NextResponse.json({ ok: true });
  });
}
