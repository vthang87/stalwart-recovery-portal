import { describe, expect, it } from "vitest";
import { passwordCredentialId } from "@/server/stalwart";

describe("password credential id", () => {
  it("uses the map key of the password credential and ignores other credentials", () => {
    expect(
      passwordCredentialId({
        "0": { "@type": "Password", secret: "****" },
        "1": { "@type": "AppPassword", secret: "****" },
      }),
    ).toBe("0");
  });

  it("keeps a non-zero password credential id", () => {
    expect(passwordCredentialId({ "3": { "@type": "Password", secret: "****" } })).toBe("3");
  });

  it("reads an array form by index", () => {
    expect(passwordCredentialId([{ "@type": "AppPassword" }, { "@type": "Password", secret: "****" }])).toBe("1");
  });

  it("falls back to the primary credential when none is present", () => {
    expect(passwordCredentialId(undefined)).toBe("0");
    expect(passwordCredentialId({})).toBe("0");
  });
});
