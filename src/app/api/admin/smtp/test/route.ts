import { NextResponse } from "next/server";
import { writeAudit } from "@/server/audit";
import { getDb } from "@/server/db";
import { isEmail } from "@/server/http";
import { createMailer, smtpFailure } from "@/server/mailer";
import { handle, meta, requireAdmin } from "@/server/route";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireAdmin(req);
    const body = (await req.json()) as { to?: string };
    const mailer = createMailer();
    const info = meta(req);
    try {
      if (body.to) {
        if (!isEmail(body.to)) return NextResponse.json({ error: "Invalid recipient email." }, { status: 400 });
        await mailer.sendTest(body.to);
      } else {
        await mailer.verify();
      }
    } catch (err) {
      writeAudit(getDb(), {
        actorPrincipalId: session.principalId,
        action: "smtp_test",
        result: "failed",
        ip: info.ip,
        userAgent: info.userAgent,
        now: Date.now(),
      });
      throw smtpFailure(err);
    }
    writeAudit(getDb(), {
      actorPrincipalId: session.principalId,
      action: "smtp_test",
      result: "ok",
      ip: info.ip,
      userAgent: info.userAgent,
      now: Date.now(),
    });
    return NextResponse.json({ ok: true });
  });
}
