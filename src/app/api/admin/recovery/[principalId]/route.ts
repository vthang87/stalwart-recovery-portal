import { NextResponse } from "next/server";
import { clearRecovery, getRecovery, upsertRecoveryEmail } from "@/server/portal";
import { deps, handle, meta, requireAdmin } from "@/server/route";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ principalId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  return handle(async () => {
    await requireAdmin(req);
    const { principalId } = await ctx.params;
    const row = getRecovery(deps().db, principalId);
    return NextResponse.json({
      principalId,
      accountEmail: row?.accountEmail ?? null,
      recoveryEmail: row?.recoveryEmail ?? null,
      verified: Boolean(row?.verifiedAt),
      verifiedAt: row?.verifiedAt ?? null,
    });
  });
}

export async function PUT(req: Request, ctx: Ctx) {
  return handle(async () => {
    await requireAdmin(req);
    const { principalId } = await ctx.params;
    const body = (await req.json()) as { recoveryEmail?: string; accountEmail?: string };
    const session = await requireAdmin(req);
    const row = upsertRecoveryEmail(deps(), {
      principalId,
      accountEmail: body.accountEmail || getRecovery(deps().db, principalId)?.accountEmail || principalId,
      recoveryEmail: body.recoveryEmail || "",
      actorPrincipalId: session.principalId,
      ...meta(req),
    });
    return NextResponse.json({ recoveryEmail: row?.recoveryEmail ?? null, verified: false });
  });
}

export async function DELETE(req: Request, ctx: Ctx) {
  return handle(async () => {
    await requireAdmin(req);
    const { principalId } = await ctx.params;
    const session = await requireAdmin(req);
    clearRecovery(deps(), { principalId, actorPrincipalId: session.principalId, ...meta(req) });
    return NextResponse.json({ ok: true });
  });
}
