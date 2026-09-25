import { NextResponse } from "next/server";
import { verifyEnrollment } from "@/server/portal";
import { deps, handle, meta, requireUser } from "@/server/route";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireUser(req);
    const body = (await req.json()) as { code?: string };
    if (!body.code) return NextResponse.json({ error: "Nhập mã OTP." }, { status: 400 });
    await verifyEnrollment(deps(), {
      principalId: session.principalId,
      code: body.code.trim(),
      ...meta(req),
    });
    return NextResponse.json({ ok: true });
  });
}
