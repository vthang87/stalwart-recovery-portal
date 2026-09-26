import type { NextConfig } from "next";
import { normalizeBasePath } from "./src/lib/base-path";

const basePath = normalizeBasePath(process.env.BASE_PATH);

const nextConfig: NextConfig = {
  output: "standalone",
  ...(basePath ? { basePath } : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
