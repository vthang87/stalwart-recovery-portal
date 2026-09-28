import { describe, expect, it } from "vitest";
import { AppError } from "@/server/http";
import { accountBasics, passwordCredentialId, userCreateFields, validateAccountName } from "@/server/stalwart";

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

describe("account basics", () => {
  it("accepts a local-part name and builds a user create object", () => {
    const basics = accountBasics({ name: "ada.lovelace", description: "Ada", locale: "en-US", domainId: "c" });
    expect(validateAccountName(basics.name)).toBeNull();
    expect(userCreateFields(basics, "secret-value")).toMatchObject({
      "@type": "User",
      name: "ada.lovelace",
      domainId: "c",
      description: "Ada",
      locale: "en-US",
      credentials: { "0": { "@type": "Password", secret: "secret-value" } },
    });
  });

  it("rejects an empty name and a missing domain", () => {
    expect(() => accountBasics({ name: " ", domainId: "c" })).toThrow(AppError);
    expect(() => accountBasics({ name: "ada", domainId: "" })).toThrow(AppError);
    expect(validateAccountName("bad name")).toMatch(/letters/);
    expect(() => accountBasics({ name: "ada", domainId: "c", locale: "vi" })).toThrow(AppError);
    expect(accountBasics({ name: "ada", domainId: "c", locale: "vi-VN" }).locale).toBe("vi-VN");
    expect(accountBasics({ name: "ada", domainId: "c", locale: "eo" }).locale).toBe("eo");
  });
});
