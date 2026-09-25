import { NextResponse } from "next/server";
import { getRecovery, upsertRecoveryEmail } from "@/server/portal";
import { deps, handle, meta, requireUser } from "@/server/route";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const session = await requireUser(req);
    const row = getRecovery(deps().db, session.principalId);
    return NextResponse.json({
      accountEmail: session.email,
      recoveryEmail: row?.recoveryEmail ?? null,
      verified: Boolean(row?.verifiedAt),
      verifiedAt: row?.verifiedAt ?? null,
    });
  });
}

export async function PUT(req: Request) {
  return handle(async () => {
    const session = await requireUser(req);
    const body = (await req.json()) as { recoveryEmail?: string };
    const row = upsertRecoveryEmail(deps(), {
      principalId: session.principalId,
      accountEmail: session.email,
      recoveryEmail: body.recoveryEmail || "",
      actorPrincipalId: session.principalId,
      ...meta(req),
    });
    return NextResponse.json({
      recoveryEmail: row?.recoveryEmail ?? null,
      verified: Boolean(row?.verifiedAt),
    });
  });
}
