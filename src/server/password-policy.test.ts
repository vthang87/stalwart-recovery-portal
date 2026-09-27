import { afterEach, describe, expect, it } from "vitest";
import { resetEnvForTests } from "@/server/env";
import { validateNewPassword } from "@/server/http";

describe("password minimum length", () => {
  afterEach(() => {
    delete process.env.PASSWORD_MIN_LENGTH;
    resetEnvForTests();
  });

  it("defaults to 8 characters", () => {
    delete process.env.PASSWORD_MIN_LENGTH;
    resetEnvForTests();
    expect(validateNewPassword("1234567")).toBe("New password must be at least 8 characters.");
    expect(validateNewPassword("12345678")).toBeNull();
  });

  it("uses PASSWORD_MIN_LENGTH when it is set", () => {
    process.env.PASSWORD_MIN_LENGTH = "10";
    resetEnvForTests();
    expect(validateNewPassword("123456789")).toBe("New password must be at least 10 characters.");
    expect(validateNewPassword("1234567890")).toBeNull();
  });
});
