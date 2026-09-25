import { NextResponse } from "next/server";
import { requestForgot } from "@/server/portal";
import { FORGOT_MESSAGE } from "@/server/http";
import { deps, handle, meta, requireAnonymousCsrf } from "@/server/route";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    await requireAnonymousCsrf(req);
    const body = (await req.json()) as { account?: string };
    const result = await requestForgot(deps(), { account: body.account || "", ...meta(req) });
    return NextResponse.json({ ok: true, message: result.message || FORGOT_MESSAGE });
  });
}
