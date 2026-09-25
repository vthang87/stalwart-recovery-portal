import { describe, expect, it } from "vitest";
import { hasRecoveryAdminAccess } from "@/server/authz";

describe("recovery admin permission", () => {
  it("uses effective permissions and ignores a role name", () => {
    expect(hasRecoveryAdminAccess(["authenticate"], ["sysAccountQuery"])).toBe(false);
    expect(hasRecoveryAdminAccess(["admin"], ["sysAccountQuery"])).toBe(false);
    expect(hasRecoveryAdminAccess(["sysAccountQuery"], ["sysAccountQuery"])).toBe(true);
    expect(hasRecoveryAdminAccess(["custom-recovery"], ["custom-recovery", "sysAccountQuery"])).toBe(true);
  });
});
