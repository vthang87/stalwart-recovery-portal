import { desc } from "drizzle-orm";
import { auditLogs, type AppDatabase } from "@/server/db";

export type AuditInput = {
  principalId?: string | null;
  actorPrincipalId?: string | null;
  action: string;
  result: string;
  ip?: string | null;
  userAgent?: string | null;
  now: number;
};

export function writeAudit(db: AppDatabase, input: AuditInput) {
  db.insert(auditLogs)
    .values({
      principalId: input.principalId ?? null,
      actorPrincipalId: input.actorPrincipalId ?? null,
      action: input.action,
      result: input.result,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      createdAt: input.now,
    })
    .run();
}

export function listAudit(db: AppDatabase, limit = 100) {
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit).all();
}
