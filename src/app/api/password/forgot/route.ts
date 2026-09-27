import { NextResponse } from "next/server";
import { requestForgot } from "@/server/portal";
import { FORGOT_MESSAGE } from "@/server/http";
import { verifyTurnstile } from "@/server/turnstile";
import { deps, handle, meta, requireAnonymousCsrf } from "@/server/route";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    await requireAnonymousCsrf(req);
    const body = (await req.json()) as { account?: string; turnstileToken?: string };
    const info = meta(req);
    await verifyTurnstile(body.turnstileToken, info.ip);
    const result = await requestForgot(deps(), { account: body.account || "", ...info });
    return NextResponse.json({ ok: true, message: result.message || FORGOT_MESSAGE });
  });
}
