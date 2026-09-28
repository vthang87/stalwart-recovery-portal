import { NextResponse } from "next/server";
import { sendAdminResetLink } from "@/server/portal";
import { deps, handle, meta, requireAdmin } from "@/server/route";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  return handle(async () => {
    const session = await requireAdmin(req);
    const { id } = await ctx.params;
    const result = await sendAdminResetLink(deps(), {
      principalId: id,
      actorPrincipalId: session.principalId,
      ...meta(req),
    });
    return NextResponse.json({ ok: true, message: `Reset link sent to ${result.sentTo}.` });
  });
}
