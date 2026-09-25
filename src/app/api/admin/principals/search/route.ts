import { NextResponse } from "next/server";
import { getRecovery } from "@/server/portal";
import { deps, handle, requireAdmin } from "@/server/route";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin(req);
    const query = new URL(req.url).searchParams.get("q")?.trim() || "";
    if (query.length < 2) return NextResponse.json({ principals: [] });
    const users = await deps().searchUsers(query);
    const principals = users.map((user) => {
      const recovery = getRecovery(deps().db, user.id);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        recoveryEmail: recovery?.recoveryEmail ?? null,
        verified: Boolean(recovery?.verifiedAt),
      };
    });
    return NextResponse.json({ principals });
  });
}
