import { NextResponse } from "next/server";
import { verifyResetOtp } from "@/server/portal";
import { RESET_COOKIE, deps, handle, meta, requireAnonymousCsrf, seal, setCookie } from "@/server/route";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    await requireAnonymousCsrf(req);
    const body = (await req.json()) as { account?: string; code?: string };
    if (!body.account || !body.code) {
      return NextResponse.json({ error: "Nhập tài khoản và mã OTP." }, { status: 400 });
    }
    const grant = await verifyResetOtp(deps(), {
      account: body.account,
      code: body.code.trim(),
      ...meta(req),
    });
    await setCookie(
      RESET_COOKIE,
      seal({ challengeId: grant.challengeId, principalId: grant.principalId, exp: Date.now() + 10 * 60 * 1000 }),
      10 * 60,
    );
    return NextResponse.json({ ok: true });
  });
}
