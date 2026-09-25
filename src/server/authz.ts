import { getEnv } from "@/server/env";

export function hasRecoveryAdminAccess(permissions: string[], required = getEnv().adminPermissions): boolean {
  return required.some((permission) => permissions.includes(permission));
}
