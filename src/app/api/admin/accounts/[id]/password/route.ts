import { NextResponse } from "next/server";
import { writeAudit } from "@/server/audit";
import { AppError, validateNewPassword } from "@/server/http";
import { deps, handle, meta, requireAdmin } from "@/server/route";
import { resetPassword } from "@/server/stalwart";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  return handle(async () => {
    const session = await requireAdmin(req);
    const { id } = await ctx.params;
    const body = (await req.json()) as { password?: string };
    const passwordError = validateNewPassword(body.password || "");
    if (passwordError) throw new AppError(400, passwordError);
    await resetPassword(id, body.password || "");
    writeAudit(deps().db, {
      principalId: id,
      actorPrincipalId: session.principalId,
      action: "admin.account.reset-password",
      result: "ok",
      now: Date.now(),
      ...meta(req),
    });
    return NextResponse.json({ ok: true });
  });
}
