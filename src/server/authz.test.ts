import { describe, expect, it } from "vitest";
import { compactSessionPermissions, hasRecoveryAdminAccess } from "@/server/authz";

describe("authz", () => {
  it("detects recovery admin when required permission is present", () => {
    expect(hasRecoveryAdminAccess(["sysAccountQuery", "jmapEmailGet"], ["sysAccountQuery"])).toBe(true);
    expect(hasRecoveryAdminAccess(["jmapEmailGet"], ["sysAccountQuery"])).toBe(false);
  });

  it("compacts session permissions to the recovery-admin allowlist", () => {
    const all = ["sysAccountQuery", "jmapEmailGet", "jmapMailboxGet", "sysAccountUpdate"];
    expect(compactSessionPermissions(all, ["sysAccountQuery"])).toEqual(["sysAccountQuery"]);
    expect(compactSessionPermissions(all, ["sysAccountQuery", "sysAccountUpdate"])).toEqual([
      "sysAccountQuery",
      "sysAccountUpdate",
    ]);
  });
});
