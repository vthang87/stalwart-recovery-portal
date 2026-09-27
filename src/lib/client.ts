"use client";

import { appPath } from "@/lib/base-path";

async function sendJson(url: string, csrf: string, body: unknown, method: string) {
  const res = await fetch(appPath(url), {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: { "content-type": "application/json", "x-csrf-token": csrf },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; ok?: boolean; csrf?: string };
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function postJson(url: string, csrf: string, body?: unknown, method = "POST") {
  try {
    return await sendJson(url, csrf, body, method);
  } catch (err) {
    if (!(err instanceof Error) || err.message !== "Invalid CSRF") throw err;
    return sendJson(url, await loadCsrf(), body, method);
  }
}

export async function loadCsrf() {
  const res = await fetch(appPath("/api/auth/session"), { cache: "no-store", credentials: "same-origin" });
  const data = (await res.json()) as { csrf: string; authenticated: boolean };
  return data.csrf;
}
