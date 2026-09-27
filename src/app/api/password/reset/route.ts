import { NextResponse } from "next/server";
import { AppError } from "@/server/http";
import { completeReset } from "@/server/portal";
import { verifyTurnstile } from "@/server/turnstile";
import { RESET_COOKIE, deps, expireCookie, handle, meta, readResetGrant, requireAnonymousCsrf } from "@/server/route";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    await requireAnonymousCsrf(req);
    const grant = await readResetGrant();
    if (!grant) throw new AppError(400, "Password reset session expired.");
    const body = (await req.json()) as { password?: string; turnstileToken?: string };
    const info = meta(req);
    await verifyTurnstile(body.turnstileToken, info.ip);
    if (!body.password) return NextResponse.json({ error: "Enter a new password." }, { status: 400 });
    await completeReset(deps(), {
      challengeId: grant.challengeId,
      principalId: grant.principalId,
      password: body.password,
      ...info,
    });
    const res = NextResponse.json({ ok: true });
    expireCookie(res, RESET_COOKIE);
    return res;
  });
}
