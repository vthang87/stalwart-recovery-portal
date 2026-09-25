import { NextResponse } from "next/server";
import { listAudit } from "@/server/audit";
import { handle, requireAdmin } from "@/server/route";
import { getDb } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin(req);
    const logs = listAudit(getDb(), 200).map((row) => ({
      id: row.id,
      principalId: row.principalId,
      actorPrincipalId: row.actorPrincipalId,
      action: row.action,
      result: row.result,
      ip: row.ip,
      createdAt: row.createdAt,
    }));
    return NextResponse.json({ logs });
  });
}
