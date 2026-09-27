"use client";

import { appPath } from "@/lib/base-path";

export async function postJson(url: string, csrf: string, body?: unknown, method = "POST") {
  const res = await fetch(appPath(url), {
    method,
    headers: { "content-type": "application/json", "x-csrf-token": csrf },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; ok?: boolean; csrf?: string };
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function loadCsrf() {
  const res = await fetch(appPath("/api/auth/session"));
  const data = (await res.json()) as { csrf: string; authenticated: boolean };
  return data.csrf;
}
