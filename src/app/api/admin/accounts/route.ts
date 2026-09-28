import { NextResponse } from "next/server";
import { writeAudit } from "@/server/audit";
import { AppError, isEmail } from "@/server/http";
import { clearRecovery, getRecovery, upsertRecoveryEmail } from "@/server/portal";
import { deps, handle, meta, requireAdmin } from "@/server/route";
import { createAccount, listAccounts, listDomains } from "@/server/stalwart";
import type { Session } from "@/server/session";

function saveBackupEmail(req: Request, session: Session, principalId: string, accountEmail: string, backupEmail: string | undefined) {
  const email = backupEmail?.trim() || "";
  if (!email) {
    if (getRecovery(deps().db, principalId)) {
      clearRecovery(deps(), { principalId, actorPrincipalId: session.principalId, ...meta(req) });
    }
    return "";
  }
  if (!isEmail(email)) throw new AppError(400, "Invalid backup email.");
  const row = upsertRecoveryEmail(deps(), {
    principalId,
    accountEmail,
    recoveryEmail: email,
    actorPrincipalId: session.principalId,
    markVerified: true,
    ...meta(req),
  });
  return row?.recoveryEmail ?? email;
}

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin(req);
    const query = new URL(req.url).searchParams.get("q")?.trim() || "";
    const [accounts, domains] = await Promise.all([listAccounts(query), listDomains()]);
    return NextResponse.json({
      accounts: accounts.map((account) => ({
        ...account,
        recoveryEmail: getRecovery(deps().db, account.id)?.recoveryEmail ?? "",
      })),
      domains,
    });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireAdmin(req);
    const body = (await req.json()) as {
      name?: string;
      description?: string;
      locale?: string;
      domainId?: string;
      password?: string;
      backupEmail?: string;
    };
    if (body.backupEmail?.trim() && !isEmail(body.backupEmail.trim())) throw new AppError(400, "Invalid backup email.");
    const account = await createAccount({
      name: body.name || "",
      description: body.description || "",
      locale: body.locale || "",
      domainId: body.domainId || "",
      password: body.password || "",
    });
    writeAudit(deps().db, {
      principalId: account.id,
      actorPrincipalId: session.principalId,
      action: "admin.account.create",
      result: "ok",
      now: Date.now(),
      ...meta(req),
    });
    const recoveryEmail = saveBackupEmail(req, session, account.id, account.email, body.backupEmail);
    return NextResponse.json({ ...account, recoveryEmail });
  });
}
