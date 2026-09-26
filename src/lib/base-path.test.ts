import { describe, expect, it } from "vitest";
import { appPath, normalizeBasePath } from "@/lib/base-path";

describe("base path", () => {
  it("normalizes a prefix", () => {
    expect(normalizeBasePath("/account")).toBe("/account");
    expect(normalizeBasePath("account/")).toBe("/account");
    expect(normalizeBasePath("")).toBe("");
  });

  it("prefixes app paths when BASE_PATH is set", () => {
    process.env.BASE_PATH = "/account";
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    expect(appPath("/login")).toBe("/account/login");
    expect(appPath("/api/health")).toBe("/account/api/health");
    expect(appPath("/account/login")).toBe("/account/login");
    delete process.env.BASE_PATH;
  });
});
