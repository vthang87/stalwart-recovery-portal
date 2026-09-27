import { getEnv } from "@/server/env";
import { AppError } from "@/server/http";

export type Principal = {
  id: string;
  email: string;
  name: string;
};

export type AuthResult =
  | { status: "ok"; permissions: string[] }
  | { status: "mfa" }
  | { status: "invalid" };

type MethodResponse = [string, Record<string, unknown>, string];

type AccountRecord = {
  id?: string;
  "@type"?: string;
  name?: string;
  emailAddress?: string;
  credentials?: unknown;
};

type CredentialRecord = { "@type"?: string };

export function passwordCredentialId(credentials: unknown): string {
  const entries = Array.isArray(credentials)
    ? credentials.map((value, index) => [String(index), value] as const)
    : credentials && typeof credentials === "object"
      ? Object.entries(credentials)
      : [];
  for (const [id, value] of entries) {
    if (value && typeof value === "object" && (value as CredentialRecord)["@type"] === "Password") return id;
  }
  return "0";
}

function basic(account: string, password: string) {
  return `Basic ${Buffer.from(`${account}:${password}`, "utf8").toString("base64")}`;
}

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function authenticate(account: string, password: string): Promise<AuthResult> {
  const env = getEnv();
  let res: Response;
  try {
    res = await fetch(`${env.stalwartUrl}/api/account`, {
      headers: { Authorization: basic(account, password), Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new AppError(503, "Could not reach the mail server.");
  }
  if (res.ok) {
    const body = (await readJson(res)) as { permissions?: string[] };
    return { status: "ok", permissions: body.permissions ?? [] };
  }
  if (res.status !== 401) throw new AppError(503, "Mail server rejected sign-in.");
  const mfa = await detectMfa(account, password);
  return mfa ? { status: "mfa" } : { status: "invalid" };
}

async function detectMfa(account: string, password: string) {
  const env = getEnv();
  try {
    const res = await fetch(`${env.stalwartUrl}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "authCode",
        accountName: account,
        accountSecret: password,
        clientId: env.stalwartOAuthClientId,
        redirectUri: env.appUrl,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return false;
    const body = (await readJson(res)) as { type?: string };
    return body.type === "mfaRequired";
  } catch {
    return false;
  }
}

async function jmap(authorization: string, methodCalls: unknown[]) {
  const env = getEnv();
  let res: Response;
  try {
    res = await fetch(`${env.stalwartUrl}/api`, {
      method: "POST",
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify({
        using: ["urn:ietf:params:jmap:core", "urn:stalwart:jmap"],
        methodCalls,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new AppError(503, "Could not reach the mail server.");
  }
  const body = (await readJson(res)) as { methodResponses?: MethodResponse[] };
  if (!res.ok) {
    throw new AppError(res.status >= 500 ? 502 : 400, "Mail server returned an error while handling the account.");
  }
  return body.methodResponses ?? [];
}

function serviceAuth() {
  const token = getEnv().stalwartApiToken;
  if (!token) throw new AppError(503, "Stalwart integration token is not configured.");
  return `Bearer ${token}`;
}

function asAccounts(response: MethodResponse | undefined): AccountRecord[] {
  const list = response?.[1]?.list;
  return Array.isArray(list) ? (list as AccountRecord[]) : [];
}

export async function findUser(account: string): Promise<Principal | null> {
  const query = account.trim();
  const responses = await jmap(serviceAuth(), [
    ["x:Account/query", { filter: { text: query }, limit: 20 }, "q"],
  ]);
  const ids = responses[0]?.[1]?.ids;
  const idList = Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  if (idList.length === 0) return null;
  const got = await jmap(serviceAuth(), [["x:Account/get", { ids: idList }, "g"]]);
  const accounts = asAccounts(got[0]).filter((item) => !item["@type"] || item["@type"] === "User");
  const needle = query.toLowerCase();
  const exact =
    accounts.find((item) => item.emailAddress?.toLowerCase() === needle) ||
    accounts.find((item) => item.name?.toLowerCase() === needle) ||
    (accounts.length === 1 ? accounts[0] : undefined);
  if (!exact?.id) return null;
  return {
    id: exact.id,
    email: exact.emailAddress || query,
    name: exact.name || query,
  };
}

export async function searchUsers(query: string): Promise<Principal[]> {
  const responses = await jmap(serviceAuth(), [
    ["x:Account/query", { filter: { text: query }, limit: 20 }, "q"],
  ]);
  const ids = responses[0]?.[1]?.ids;
  const idList = Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  if (idList.length === 0) return [];
  const got = await jmap(serviceAuth(), [["x:Account/get", { ids: idList }, "g"]]);
  return asAccounts(got[0])
    .filter((item) => item.id && (!item["@type"] || item["@type"] === "User"))
    .map((item) => ({
      id: item.id as string,
      email: item.emailAddress || item.name || item.id || "",
      name: item.name || "",
    }));
}

export async function changeOwnPassword(account: string, currentPassword: string, nextPassword: string) {
  const responses = await jmap(basic(account, currentPassword), [
    [
      "x:AccountPassword/set",
      { update: { singleton: { secret: nextPassword, currentSecret: currentPassword } } },
      "c1",
    ],
  ]);
  assertUpdated(responses[0], "Could not change the password on the mail server.");
}

export async function resetPassword(principalId: string, nextPassword: string) {
  const got = await jmap(serviceAuth(), [["x:Account/get", { ids: [principalId] }, "g"]]);
  const account = asAccounts(got[0]).find((item) => item.id === principalId) ?? asAccounts(got[0])[0];
  const credentialId = passwordCredentialId(account?.credentials);
  const responses = await jmap(serviceAuth(), [
    [
      "x:Account/set",
      {
        update: {
          [principalId]: {
            credentials: {
              [credentialId]: { "@type": "Password", secret: nextPassword },
            },
          },
        },
      },
      "c1",
    ],
  ]);
  assertUpdated(responses[0], "Could not reset the password on the mail server.");
}

function assertUpdated(response: MethodResponse | undefined, fallback: string) {
  const name = response?.[0];
  const body = response?.[1] ?? {};
  if (name === "error") {
    const description = typeof body.description === "string" ? body.description : "";
    throw new AppError(400, description || fallback);
  }
  const notUpdated = body.notUpdated as Record<string, { description?: string }> | undefined;
  if (notUpdated && Object.keys(notUpdated).length > 0) {
    const description = Object.values(notUpdated)[0]?.description;
    throw new AppError(400, description || fallback);
  }
  const updated = body.updated as Record<string, unknown> | undefined;
  if (!updated || Object.keys(updated).length === 0) throw new AppError(502, fallback);
}
