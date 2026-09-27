import { beforeAll, describe, expect, it } from "vitest";
import { resetEnvForTests } from "@/server/env";
import { CSRF_COOKIE, cookieValues, expiredSetCookies, matchingAnonymousCsrf, seal } from "@/server/session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-pepper";
  resetEnvForTests();
});

describe("anonymous csrf cookies", () => {
  it("matches the submitted token when an older cookie is also sent", () => {
    const now = Date.now();
    const stale = seal({ csrf: "stale-token", exp: now + 60_000 });
    const current = seal({ csrf: "current-token", exp: now + 60_000 });
    const header = `${CSRF_COOKIE}=${stale}; ${CSRF_COOKIE}=${current}`;
    expect(cookieValues(header, CSRF_COOKIE)).toEqual([stale, current]);
    expect(matchingAnonymousCsrf(header, "current-token", now)).toBe("current-token");
    expect(matchingAnonymousCsrf(header, "missing", now)).toBeNull();
  });

  it("expires the session cookie only on the portal base path", () => {
    process.env.BASE_PATH = "/account";
    resetEnvForTests();
    const headers = expiredSetCookies("srp_session", true);
    expect(headers).toEqual([
      "srp_session=; Path=/account; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax; Secure",
    ]);
  });
});
