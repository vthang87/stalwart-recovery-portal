import { and, eq, sql } from "drizzle-orm";
import { rateLimits, type AppDatabase } from "@/server/db";

export function isRateLimited(db: AppDatabase, bucket: string, limit: number, windowMs: number, now: number) {
  const row = db.select().from(rateLimits).where(eq(rateLimits.bucket, bucket)).get();
  if (!row || now - row.windowStart >= windowMs) {
    db.insert(rateLimits)
      .values({ bucket, count: 1, windowStart: now })
      .onConflictDoUpdate({
        target: rateLimits.bucket,
        set: { count: 1, windowStart: now },
      })
      .run();
    return false;
  }
  if (row.count >= limit) return true;
  db.update(rateLimits)
    .set({ count: sql`${rateLimits.count} + 1` })
    .where(and(eq(rateLimits.bucket, bucket)))
    .run();
  return false;
}
