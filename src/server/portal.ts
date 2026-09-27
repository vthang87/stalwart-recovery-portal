import { and, desc, eq, isNull } from "drizzle-orm";
import { writeAudit } from "@/server/audit";
import { recoveryAccounts, resetChallenges, type AppDatabase } from "@/server/db";
import { getEnv } from "@/server/env";
import { AppError, FORGOT_MESSAGE, OTP_INVALID_MESSAGE, isEmail, validateNewPassword } from "@/server/http";
import type { Mailer } from "@/server/mailer";
import { generateOtp, hashOtp, newId, otpMatches } from "@/server/otp";
import { isRateLimited } from "@/server/rate-limit";
import { compactSessionPermissions } from "@/server/authz";
import {
  authenticate,
  changeOwnPassword,
  findUser,
  resetPassword,
  searchUsers,
  type Principal,
} from "@/server/stalwart";

export type PortalDeps = {
  db: AppDatabase;
  mailer: Mailer;
  now: () => number;
  findUser: typeof findUser;
  searchUsers: typeof searchUsers;
  authenticate: typeof authenticate;
  changeOwnPassword: typeof changeOwnPassword;
  resetPassword: typeof resetPassword;
};

export function defaultDeps(db: AppDatabase, mailer: Mailer): PortalDeps {
  return {
    db,
    mailer,
    now: () => Date.now(),
    findUser,
    searchUsers,
    authenticate,
    changeOwnPassword,
    resetPassword,
  };
}

function pepper() {
  return getEnv().sessionSecret;
}

export function getRecovery(db: AppDatabase, principalId: string) {
  return db.select().from(recoveryAccounts).where(eq(recoveryAccounts.principalId, principalId)).get() ?? null;
}

export function upsertRecoveryEmail(
  deps: PortalDeps,
  input: {
    principalId: string;
    accountEmail: string;
    recoveryEmail: string;
    actorPrincipalId: string;
    ip: string;
    userAgent: string;
    markVerified?: boolean;
  },
) {
  const email = input.recoveryEmail.trim().toLowerCase();
  if (!isEmail(email)) throw new AppError(400, "Invalid recovery email.");
  const now = deps.now();
  const existing = getRecovery(deps.db, input.principalId);
  const changed = existing?.recoveryEmail !== email;
  const verifiedAt = input.markVerified ? now : changed ? null : (existing?.verifiedAt ?? null);
  deps.db
    .insert(recoveryAccounts)
    .values({
      principalId: input.principalId,
      accountEmail: input.accountEmail,
      recoveryEmail: email,
      verifiedAt,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: recoveryAccounts.principalId,
      set: {
        accountEmail: input.accountEmail,
        recoveryEmail: email,
        verifiedAt,
        updatedAt: now,
      },
    })
    .run();
  if (changed || input.markVerified) revokeChallenges(deps, input.principalId, "enroll");
  writeAudit(deps.db, {
    principalId: input.principalId,
    actorPrincipalId: input.actorPrincipalId,
    action: "recovery_update",
    result: "ok",
    ip: input.ip,
    userAgent: input.userAgent,
    now,
  });
  return getRecovery(deps.db, input.principalId);
}

export function clearRecovery(
  deps: PortalDeps,
  input: { principalId: string; actorPrincipalId: string; ip: string; userAgent: string },
) {
  const now = deps.now();
  deps.db.delete(recoveryAccounts).where(eq(recoveryAccounts.principalId, input.principalId)).run();
  revokeChallenges(deps, input.principalId);
  writeAudit(deps.db, {
    principalId: input.principalId,
    actorPrincipalId: input.actorPrincipalId,
    action: "recovery_delete",
    result: "ok",
    ip: input.ip,
    userAgent: input.userAgent,
    now,
  });
}

export function revokeChallenges(deps: PortalDeps, principalId: string, purpose?: string) {
  const now = deps.now();
  const filters = [eq(resetChallenges.principalId, principalId), isNull(resetChallenges.usedAt)];
  if (purpose) filters.push(eq(resetChallenges.purpose, purpose));
  deps.db
    .update(resetChallenges)
    .set({ usedAt: now })
    .where(and(...filters))
    .run();
}

export async function sendVerification(
  deps: PortalDeps,
  input: { principalId: string; actorPrincipalId: string; ip: string; userAgent: string },
) {
  const row = getRecovery(deps.db, input.principalId);
  if (!row?.recoveryEmail) throw new AppError(400, "No recovery email set.");
  await issueOtp(deps, {
    principalId: input.principalId,
    purpose: "enroll",
    to: row.recoveryEmail,
    recoveryEmail: row.recoveryEmail,
    ip: input.ip,
    userAgent: input.userAgent,
    actorPrincipalId: input.actorPrincipalId,
    action: "recovery_verify_sent",
  });
}

export async function verifyEnrollment(
  deps: PortalDeps,
  input: { principalId: string; code: string; ip: string; userAgent: string },
) {
  const row = consumeOtp(deps, {
    principalId: input.principalId,
    purpose: "enroll",
    code: input.code,
  });
  const now = deps.now();
  deps.db
    .update(recoveryAccounts)
    .set({
      recoveryEmail: row.recoveryEmail,
      verifiedAt: now,
      updatedAt: now,
    })
    .where(eq(recoveryAccounts.principalId, input.principalId))
    .run();
  writeAudit(deps.db, {
    principalId: input.principalId,
    actorPrincipalId: input.principalId,
    action: "recovery_verified",
    result: "ok",
    ip: input.ip,
    userAgent: input.userAgent,
    now,
  });
}

export async function requestForgot(
  deps: PortalDeps,
  input: { account: string; ip: string; userAgent: string },
) {
  const now = deps.now();
  const account = input.account.trim();
  const blocked =
    isRateLimited(deps.db, `forgot:ip:${input.ip}`, 5, 15 * 60 * 1000, now) ||
    isRateLimited(deps.db, `forgot:acct:${account.toLowerCase()}`, 5, 15 * 60 * 1000, now);
  if (blocked || !account) {
    writeAudit(deps.db, {
      action: "password_reset_requested",
      result: blocked ? "rate_limited" : "empty",
      ip: input.ip,
      userAgent: input.userAgent,
      now,
    });
    return { message: FORGOT_MESSAGE };
  }
  let principal: Principal | null = null;
  try {
    principal = await deps.findUser(account);
  } catch {
    writeAudit(deps.db, {
      action: "password_reset_requested",
      result: "lookup_failed",
      ip: input.ip,
      userAgent: input.userAgent,
      now,
    });
    return { message: FORGOT_MESSAGE };
  }
  const recovery = principal ? getRecovery(deps.db, principal.id) : null;
  if (!principal || !recovery?.verifiedAt || !recovery.recoveryEmail) {
    writeAudit(deps.db, {
      principalId: principal?.id,
      action: "password_reset_requested",
      result: "unavailable",
      ip: input.ip,
      userAgent: input.userAgent,
      now,
    });
    return { message: FORGOT_MESSAGE };
  }
  try {
    await issueOtp(deps, {
      principalId: principal.id,
      purpose: "reset",
      to: recovery.recoveryEmail,
      recoveryEmail: recovery.recoveryEmail,
      ip: input.ip,
      userAgent: input.userAgent,
      actorPrincipalId: principal.id,
      action: "password_reset_requested",
    });
  } catch (err) {
    writeAudit(deps.db, {
      principalId: principal.id,
      action: "password_reset_requested",
      result: err instanceof AppError && err.message.includes("wait") ? "cooldown" : "send_failed",
      ip: input.ip,
      userAgent: input.userAgent,
      now: deps.now(),
    });
  }
  return { message: FORGOT_MESSAGE };
}

export async function verifyResetOtp(
  deps: PortalDeps,
  input: { account: string; code: string; ip: string; userAgent: string },
) {
  const now = deps.now();
  if (isRateLimited(deps.db, `verify:ip:${input.ip}`, 10, 15 * 60 * 1000, now)) {
    throw new AppError(429, OTP_INVALID_MESSAGE);
  }
  let principal: Principal | null = null;
  try {
    principal = await deps.findUser(input.account.trim());
  } catch {
    throw new AppError(400, OTP_INVALID_MESSAGE);
  }
  if (!principal) throw new AppError(400, OTP_INVALID_MESSAGE);
  const challenge = consumeOtp(deps, { principalId: principal.id, purpose: "reset", code: input.code, grant: true });
  return { challengeId: challenge.id, principalId: principal.id };
}

export async function completeReset(
  deps: PortalDeps,
  input: { challengeId: string; principalId: string; password: string; ip: string; userAgent: string },
) {
  const problem = validateNewPassword(input.password);
  if (problem) throw new AppError(400, problem);
  const challenge = deps.db.select().from(resetChallenges).where(eq(resetChallenges.id, input.challengeId)).get();
  const now = deps.now();
  if (
    !challenge ||
    challenge.principalId !== input.principalId ||
    challenge.purpose !== "reset" ||
    !challenge.grantedAt ||
    challenge.usedAt ||
    challenge.expiresAt < now
  ) {
    throw new AppError(400, "Password reset session expired.");
  }
  await deps.resetPassword(input.principalId, input.password);
  deps.db.update(resetChallenges).set({ usedAt: now }).where(eq(resetChallenges.id, challenge.id)).run();
  revokeChallenges(deps, input.principalId);
  writeAudit(deps.db, {
    principalId: input.principalId,
    actorPrincipalId: input.principalId,
    action: "password_reset",
    result: "ok",
    ip: input.ip,
    userAgent: input.userAgent,
    now,
  });
}

export async function changePassword(
  deps: PortalDeps,
  input: {
    account: string;
    principalId: string;
    currentPassword: string;
    nextPassword: string;
    ip: string;
    userAgent: string;
  },
) {
  const problem = validateNewPassword(input.nextPassword);
  if (problem) throw new AppError(400, problem);
  if (input.currentPassword === input.nextPassword) {
    throw new AppError(400, "New password must differ from the current password.");
  }
  const auth = await deps.authenticate(input.account, input.currentPassword);
  if (auth.status !== "ok") throw new AppError(400, "Current password is incorrect.");
  await deps.changeOwnPassword(input.account, input.currentPassword, input.nextPassword);
  const now = deps.now();
  revokeChallenges(deps, input.principalId, "reset");
  writeAudit(deps.db, {
    principalId: input.principalId,
    actorPrincipalId: input.principalId,
    action: "password_changed",
    result: "ok",
    ip: input.ip,
    userAgent: input.userAgent,
    now,
  });
}

async function issueOtp(
  deps: PortalDeps,
  input: {
    principalId: string;
    purpose: string;
    to: string;
    recoveryEmail: string;
    ip: string;
    userAgent: string;
    actorPrincipalId: string;
    action: string;
  },
) {
  const env = getEnv();
  const now = deps.now();
  const latest = deps.db
    .select()
    .from(resetChallenges)
    .where(and(eq(resetChallenges.principalId, input.principalId), eq(resetChallenges.purpose, input.purpose)))
    .orderBy(desc(resetChallenges.createdAt))
    .get();
  if (latest && now - latest.createdAt < env.otpResendCooldownSeconds * 1000) {
    throw new AppError(429, `Please wait ${env.otpResendCooldownSeconds} seconds before requesting another code.`);
  }
  const id = newId();
  const code = generateOtp(env.otpLength);
  revokeChallenges(deps, input.principalId, input.purpose);
  deps.db
    .insert(resetChallenges)
    .values({
      id,
      principalId: input.principalId,
      purpose: input.purpose,
      secretHash: hashOtp(code, id, pepper()),
      recoveryEmail: input.recoveryEmail,
      expiresAt: now + env.otpTtlMinutes * 60 * 1000,
      attempts: 0,
      requestIp: input.ip,
      createdAt: now,
    })
    .run();
  try {
    await deps.mailer.sendOtp(input.to, code);
  } catch (err) {
    deps.db.delete(resetChallenges).where(eq(resetChallenges.id, id)).run();
    writeAudit(deps.db, {
      principalId: input.principalId,
      actorPrincipalId: input.actorPrincipalId,
      action: input.action,
      result: "smtp_failed",
      ip: input.ip,
      userAgent: input.userAgent,
      now,
    });
    throw err;
  }
  writeAudit(deps.db, {
    principalId: input.principalId,
    actorPrincipalId: input.actorPrincipalId,
    action: input.action,
    result: "sent",
    ip: input.ip,
    userAgent: input.userAgent,
    now,
  });
}

function consumeOtp(
  deps: PortalDeps,
  input: { principalId: string; purpose: string; code: string; grant?: boolean },
) {
  const env = getEnv();
  const now = deps.now();
  const challenge = deps.db
    .select()
    .from(resetChallenges)
    .where(
      and(
        eq(resetChallenges.principalId, input.principalId),
        eq(resetChallenges.purpose, input.purpose),
        isNull(resetChallenges.usedAt),
      ),
    )
    .orderBy(desc(resetChallenges.createdAt))
    .get();
  if (!challenge || challenge.expiresAt < now || challenge.attempts >= env.otpMaxAttempts) {
    throw new AppError(400, OTP_INVALID_MESSAGE);
  }
  if (!otpMatches(input.code, challenge.id, pepper(), challenge.secretHash)) {
    const attempts = challenge.attempts + 1;
    deps.db
      .update(resetChallenges)
      .set({ attempts, usedAt: attempts >= env.otpMaxAttempts ? now : null })
      .where(eq(resetChallenges.id, challenge.id))
      .run();
    throw new AppError(400, OTP_INVALID_MESSAGE);
  }
  if (input.grant) {
    deps.db.update(resetChallenges).set({ grantedAt: now }).where(eq(resetChallenges.id, challenge.id)).run();
  } else {
    deps.db.update(resetChallenges).set({ usedAt: now }).where(eq(resetChallenges.id, challenge.id)).run();
  }
  return challenge;
}

export async function loginAccount(
  deps: PortalDeps,
  input: { account: string; password: string; ip: string; userAgent: string },
) {
  const now = deps.now();
  if (isRateLimited(deps.db, `login:ip:${input.ip}`, 10, 15 * 60 * 1000, now)) {
    throw new AppError(429, "Try again in a few minutes.");
  }
  const auth = await deps.authenticate(input.account.trim(), input.password);
  if (auth.status === "mfa") {
    throw new AppError(401, "This account requires Stalwart MFA. Complete MFA on the mail server before signing in.");
  }
  if (auth.status !== "ok") {
    writeAudit(deps.db, {
      action: "login",
      result: "invalid",
      ip: input.ip,
      userAgent: input.userAgent,
      now,
    });
    throw new AppError(401, "Invalid account or password.");
  }
  const principal = await deps.findUser(input.account.trim());
  if (!principal) throw new AppError(401, "Invalid account or password.");
  const existing = getRecovery(deps.db, principal.id);
  deps.db
    .insert(recoveryAccounts)
    .values({
      principalId: principal.id,
      accountEmail: principal.email,
      recoveryEmail: existing?.recoveryEmail ?? null,
      verifiedAt: existing?.verifiedAt ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: recoveryAccounts.principalId,
      set: { accountEmail: principal.email, updatedAt: now },
    })
    .run();
  writeAudit(deps.db, {
    principalId: principal.id,
    actorPrincipalId: principal.id,
    action: "login",
    result: "ok",
    ip: input.ip,
    userAgent: input.userAgent,
    now,
  });
  return { principal, permissions: compactSessionPermissions(auth.permissions) };
}
