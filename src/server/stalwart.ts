import { isStalwartLocale } from "@/lib/locales";
import { getEnv } from "@/server/env";
import { AppError, validateNewPassword } from "@/server/http";

export type Principal = {
  id: string;
  email: string;
  name: string;
};

export type AccountProfile = Principal & {
  description: string;
  locale: string;
  domainId: string;
};

export type MailDomain = {
  id: string;
  name: string;
};

export type AccountBasics = {
  name: string;
  description: string;
  locale: string;
  domainId: string;
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
  description?: string | null;
  locale?: string | null;
  domainId?: string | null;
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

const JMAP_PATHS = ["/api", "/jmap"];
let preferredJmapPath: string | null = null;

async function jmap(authorization: string, methodCalls: unknown[]) {
  const env = getEnv();
  const paths = preferredJmapPath
    ? [preferredJmapPath, ...JMAP_PATHS.filter((path) => path !== preferredJmapPath)]
    : JMAP_PATHS;
  const payload = JSON.stringify({
    using: ["urn:ietf:params:jmap:core", "urn:stalwart:jmap"],
    methodCalls,
  });
  let res: Response | null = null;
  for (const path of paths) {
    try {
      res = await fetch(`${env.stalwartUrl}${path}`, {
        method: "POST",
        headers: { Authorization: authorization, "Content-Type": "application/json" },
        body: payload,
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new AppError(503, "Could not reach the mail server.");
    }
    if (res.status !== 404) {
      preferredJmapPath = path;
      break;
    }
  }
  const body = (await readJson(res as Response)) as { methodResponses?: MethodResponse[] };
  if (!res?.ok) {
    throw new AppError((res?.status ?? 500) >= 500 ? 502 : 400, "Mail server returned an error while handling the account.");
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

function idsOf(response: MethodResponse | undefined) {
  const ids = response?.[1]?.ids;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}

function toProfile(item: AccountRecord): AccountProfile | null {
  if (!item.id || (item["@type"] && item["@type"] !== "User")) return null;
  return {
    id: item.id,
    email: item.emailAddress || item.name || item.id,
    name: item.name || "",
    description: item.description || "",
    locale: item.locale || "en-US",
    domainId: item.domainId || "",
  };
}

export function validateAccountName(name: string) {
  if (!name) return "Name is required.";
  if (name.length > 64) return "Name is too long.";
  if (!/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/i.test(name)) {
    return "Name can use letters, numbers, dots, underscores, and hyphens.";
  }
  return null;
}

export function accountBasics(input: { name?: string; description?: string; locale?: string; domainId?: string }): AccountBasics {
  const name = input.name?.trim() || "";
  const description = input.description?.trim() || "";
  const locale = input.locale?.trim() || "en-US";
  const domainId = input.domainId?.trim() || "";
  const nameError = validateAccountName(name);
  if (nameError) throw new AppError(400, nameError);
  if (!domainId) throw new AppError(400, "Domain is required.");
  if (description.length > 200) throw new AppError(400, "Description is too long.");
  if (!isStalwartLocale(locale)) throw new AppError(400, "Choose a supported locale.");
  return { name, description, locale, domainId };
}

export function userCreateFields(basics: AccountBasics, password: string) {
  return {
    "@type": "User",
    name: basics.name,
    domainId: basics.domainId,
    description: basics.description || null,
    locale: basics.locale,
    credentials: { "0": { "@type": "Password", secret: password } },
    roles: { "@type": "User" },
    permissions: { "@type": "Inherit" },
    encryptionAtRest: { "@type": "Disabled" },
    aliases: {},
    memberGroupIds: {},
    quotas: {},
  };
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
  return listAccounts(query, 20);
}

export async function listAccounts(query = "", limit = 200): Promise<AccountProfile[]> {
  const text = query.trim();
  const responses = await jmap(serviceAuth(), [
    ["x:Account/query", text ? { filter: { text }, limit } : { limit }, "q"],
  ]);
  const idList = idsOf(responses[0]);
  if (idList.length === 0) return [];
  const got = await jmap(serviceAuth(), [["x:Account/get", { ids: idList }, "g"]]);
  return asAccounts(got[0]).flatMap((item) => {
    const profile = toProfile(item);
    return profile ? [profile] : [];
  });
}

export async function listDomains(): Promise<MailDomain[]> {
  const responses = await jmap(serviceAuth(), [["x:Domain/query", { limit: 100 }, "q"]]);
  const idList = idsOf(responses[0]);
  if (idList.length === 0) return [];
  const got = await jmap(serviceAuth(), [["x:Domain/get", { ids: idList }, "g"]]);
  const list = got[0]?.[1]?.list;
  if (!Array.isArray(list)) return [];
  return list
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as { id?: string; name?: string };
      if (!row.id || !row.name) return [];
      return [{ id: row.id, name: row.name }];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createAccount(input: AccountBasics & { password: string }): Promise<AccountProfile> {
  const basics = accountBasics(input);
  const passwordError = validateNewPassword(input.password);
  if (passwordError) throw new AppError(400, passwordError);
  const responses = await jmap(serviceAuth(), [
    ["x:Account/set", { create: { new: userCreateFields(basics, input.password) } }, "c1"],
  ]);
  const id = assertCreated(responses[0], "Could not create the account.");
  const created = (await listAccounts(basics.name, 20)).find((account) => account.id === id);
  return (
    created || {
      id,
      email: basics.name,
      name: basics.name,
      description: basics.description,
      locale: basics.locale,
      domainId: basics.domainId,
    }
  );
}

export async function updateAccount(principalId: string, input: AccountBasics): Promise<AccountProfile> {
  const basics = accountBasics(input);
  const responses = await jmap(serviceAuth(), [
    [
      "x:Account/set",
      {
        update: {
          [principalId]: {
            name: basics.name,
            domainId: basics.domainId,
            description: basics.description || null,
            locale: basics.locale,
          },
        },
      },
      "c1",
    ],
  ]);
  assertUpdated(responses[0], "Could not update the account.");
  const updated = (await listAccounts(basics.name, 20)).find((account) => account.id === principalId);
  if (!updated) throw new AppError(502, "The account was updated but could not be read back.");
  return updated;
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

function methodFailure(response: MethodResponse | undefined, rejectedKey: "notCreated" | "notUpdated", fallback: string) {
  const name = response?.[0];
  const body = response?.[1] ?? {};
  if (name === "error") {
    const description = typeof body.description === "string" ? body.description : "";
    throw new AppError(400, description || fallback);
  }
  const rejected = body[rejectedKey] as Record<string, { description?: string }> | undefined;
  if (rejected && Object.keys(rejected).length > 0) {
    const description = Object.values(rejected)[0]?.description;
    throw new AppError(400, description || fallback);
  }
  return body;
}

function assertCreated(response: MethodResponse | undefined, fallback: string) {
  const body = methodFailure(response, "notCreated", fallback);
  const created = body.created as Record<string, { id?: string } | string> | undefined;
  const value = created ? Object.values(created)[0] : undefined;
  const id = typeof value === "string" ? value : value?.id;
  if (!id) throw new AppError(502, fallback);
  return id;
}

function assertUpdated(response: MethodResponse | undefined, fallback: string) {
  const body = methodFailure(response, "notUpdated", fallback);
  const updated = body.updated as Record<string, unknown> | undefined;
  if (!updated || Object.keys(updated).length === 0) throw new AppError(502, fallback);
}
