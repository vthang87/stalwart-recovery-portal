import { describe, expect, it } from "vitest";
import { turnstileMode } from "@/server/turnstile";

describe("turnstile", () => {
  it("stays off in development until both keys exist", () => {
    expect(turnstileMode("", "", "development")).toBe("off");
    expect(turnstileMode("site", "", "development")).toBe("misconfigured");
    expect(turnstileMode("site", "secret", "development")).toBe("on");
  });

  it("requires both keys in production", () => {
    expect(turnstileMode("", "", "production")).toBe("misconfigured");
    expect(turnstileMode("site", "secret", "production")).toBe("on");
  });
});
