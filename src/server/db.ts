import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { getEnv } from "@/server/env";

export const recoveryAccounts = sqliteTable("recovery_accounts", {
  principalId: text("principal_id").primaryKey(),
  accountEmail: text("account_email").notNull(),
  recoveryEmail: text("recovery_email"),
  verifiedAt: integer("verified_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const resetChallenges = sqliteTable("reset_challenges", {
  id: text("id").primaryKey(),
  principalId: text("principal_id").notNull(),
  purpose: text("purpose").notNull(),
  secretHash: text("secret_hash").notNull(),
  recoveryEmail: text("recovery_email"),
  expiresAt: integer("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  usedAt: integer("used_at"),
  grantedAt: integer("granted_at"),
  requestIp: text("request_ip"),
  createdAt: integer("created_at").notNull(),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  principalId: text("principal_id"),
  actorPrincipalId: text("actor_principal_id"),
  action: text("action").notNull(),
  result: text("result").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at").notNull(),
});

export const rateLimits = sqliteTable("rate_limits", {
  bucket: text("bucket").primaryKey(),
  count: integer("count").notNull(),
  windowStart: integer("window_start").notNull(),
});

export const schema = { recoveryAccounts, resetChallenges, auditLogs, rateLimits };

const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
CREATE TABLE IF NOT EXISTS recovery_accounts (
  principal_id TEXT PRIMARY KEY,
  account_email TEXT NOT NULL,
  recovery_email TEXT,
  verified_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reset_challenges (
  id TEXT PRIMARY KEY,
  principal_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  recovery_email TEXT,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  used_at INTEGER,
  granted_at INTEGER,
  request_ip TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  principal_id TEXT,
  actor_principal_id TEXT,
  action TEXT NOT NULL,
  result TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_challenges_principal ON reset_challenges(principal_id, purpose, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
`;

export type AppDatabase = BetterSQLite3Database<typeof schema>;

let cached: { db: AppDatabase; sqlite: Database.Database } | null = null;

export function openDatabase(filename: string): AppDatabase {
  if (filename !== ":memory:") {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }
  const sqlite = new Database(filename);
  sqlite.exec(SCHEMA_SQL);
  return drizzle(sqlite, { schema });
}

export function getDb(): AppDatabase {
  if (cached) return cached.db;
  const filename = path.join(getEnv().dataDir, "recovery.db");
  if (filename !== ":memory:") {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }
  const sqlite = new Database(filename);
  sqlite.exec(SCHEMA_SQL);
  const db = drizzle(sqlite, { schema });
  cached = { db, sqlite };
  return db;
}

export function closeDbForTests() {
  cached?.sqlite.close();
  cached = null;
}
