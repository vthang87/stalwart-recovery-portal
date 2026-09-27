import { NextResponse } from "next/server";
import { loginAccount } from "@/server/portal";
import { verifyTurnstile } from "@/server/turnstile";
import {
  SESSION_COOKIE,
  deps,
  handle,
  meta,
  requireAnonymousCsrf,
  sessionToken,
  setCookie,
} from "@/server/route";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    await requireAnonymousCsrf(req);
    const body = (await req.json()) as { account?: string; password?: string; turnstileToken?: string };
    const info = meta(req);
    await verifyTurnstile(body.turnstileToken, info.ip);
    if (!body.account || !body.password) {
      return NextResponse.json({ error: "Nhập tài khoản và mật khẩu." }, { status: 400 });
    }
    const result = await loginAccount(deps(), {
      account: body.account,
      password: body.password,
      ...info,
    });
    const issued = sessionToken({
      principalId: result.principal.id,
      email: result.principal.email,
      permissions: result.permissions,
    });
    await setCookie(SESSION_COOKIE, issued.token, 12 * 60 * 60);
    return NextResponse.json({ ok: true, csrf: issued.csrf });
  });
}
