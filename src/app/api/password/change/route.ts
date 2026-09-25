import { NextResponse } from "next/server";
import { changePassword } from "@/server/portal";
import { deps, handle, meta, requireUser } from "@/server/route";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireUser(req);
    const body = (await req.json()) as { currentPassword?: string; nextPassword?: string };
    if (!body.currentPassword || !body.nextPassword) {
      return NextResponse.json({ error: "Nhập mật khẩu hiện tại và mật khẩu mới." }, { status: 400 });
    }
    await changePassword(deps(), {
      account: session.email,
      principalId: session.principalId,
      currentPassword: body.currentPassword,
      nextPassword: body.nextPassword,
      ...meta(req),
    });
    return NextResponse.json({ ok: true });
  });
}
