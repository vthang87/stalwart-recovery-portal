export function normalizeBasePath(value: string | undefined) {
  const raw = (value || "").trim().replace(/\/$/, "");
  if (!raw) return "";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export function appPath(path: string) {
  const base = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH || process.env.BASE_PATH);
  if (!base) return path;
  if (path === base || path.startsWith(`${base}/`)) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
