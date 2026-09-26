import { getEnv } from "@/server/env";

export function hasRecoveryAdminAccess(permissions: string[], required = getEnv().adminPermissions): boolean {
  return required.some((permission) => permissions.includes(permission));
}

/** Keep only recovery-admin permissions so the session cookie stays under browser size limits. */
export function compactSessionPermissions(
  permissions: string[],
  required = getEnv().adminPermissions,
): string[] {
  return required.filter((permission) => permissions.includes(permission));
}
