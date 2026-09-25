import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { handle } from "@/server/route";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    getDb().all(sql`select 1 as ok`);
    return NextResponse.json({ ok: true });
  });
}
