import { NextResponse } from "next/server";
import { writeAudit } from "@/server/audit";
import { AppError, isEmail } from "@/server/http";
import { clearRecovery, getRecovery, upsertRecoveryEmail } from "@/server/portal";
import { deps, handle, meta, requireAdmin } from "@/server/route";
import { updateAccount } from "@/server/stalwart";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  return handle(async () => {
    const session = await requireAdmin(req);
    const { id } = await ctx.params;
    const body = (await req.json()) as {
      name?: string;
      description?: string;
      locale?: string;
      domainId?: string;
      backupEmail?: string;
    };
    const backupEmail = body.backupEmail?.trim() || "";
    if (backupEmail && !isEmail(backupEmail)) throw new AppError(400, "Invalid backup email.");
    const account = await updateAccount(id, {
      name: body.name || "",
      description: body.description || "",
      locale: body.locale || "",
      domainId: body.domainId || "",
    });
    const row = getRecovery(deps().db, account.id);
    const current = row?.recoveryEmail ?? "";
    let recoveryEmail = current;
    const mailboxChanged = Boolean(backupEmail) && row?.accountEmail !== account.email;
    if (backupEmail !== current || mailboxChanged) {
      if (!backupEmail) {
        clearRecovery(deps(), { principalId: account.id, actorPrincipalId: session.principalId, ...meta(req) });
        recoveryEmail = "";
      } else {
        recoveryEmail =
          upsertRecoveryEmail(deps(), {
            principalId: account.id,
            accountEmail: account.email,
            recoveryEmail: backupEmail,
            actorPrincipalId: session.principalId,
            markVerified: true,
            ...meta(req),
          })?.recoveryEmail ?? backupEmail;
      }
    }
    writeAudit(deps().db, {
      principalId: account.id,
      actorPrincipalId: session.principalId,
      action: "admin.account.update",
      result: "ok",
      now: Date.now(),
      ...meta(req),
    });
    return NextResponse.json({ ...account, recoveryEmail });
  });
}
