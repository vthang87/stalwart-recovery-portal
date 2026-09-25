import { Fraunces, Source_Sans_3 } from "next/font/google";
import type { ReactNode } from "react";
import { Header } from "@/components/header";
import { getEnv } from "@/server/env";
import { getSession } from "@/server/session";
import { hasRecoveryAdminAccess } from "@/server/authz";
import "./globals.css";

const sans = Source_Sans_3({ subsets: ["latin", "vietnamese"], variable: "--font-sans" });
const serif = Fraunces({ subsets: ["latin", "vietnamese"], variable: "--font-serif" });

export const metadata = { title: "Khôi phục tài khoản" };

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  return (
    <html lang="vi">
      <body className={`${sans.variable} ${serif.variable} ${sans.className}`}>
        <div className="shell">
          <Header
            appName={getEnv().appName}
            email={session?.email}
            isAdmin={session ? hasRecoveryAdminAccess(session.permissions) : false}
          />
          <main className="page">{children}</main>
        </div>
      </body>
    </html>
  );
}
