import { NextResponse } from "next/server";
import { sendVerification } from "@/server/portal";
import { deps, handle, meta, requireUser } from "@/server/route";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireUser(req);
    await sendVerification(deps(), {
      principalId: session.principalId,
      actorPrincipalId: session.principalId,
      ...meta(req),
    });
    return NextResponse.json({ ok: true });
  });
}
