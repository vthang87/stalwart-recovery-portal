import { Geist } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import { Header } from "@/components/header";
import { NavigationProgress } from "@/components/navigation-progress";
import { cn } from "@/lib/utils";
import { hasRecoveryAdminAccess } from "@/server/authz";
import { getEnv } from "@/server/env";
import { getSession } from "@/server/session";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = { title: "Account recovery" };

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="min-h-svh bg-background text-foreground antialiased">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <Header
          appName={getEnv().appName}
          email={session?.email}
          isAdmin={session ? hasRecoveryAdminAccess(session.permissions) : false}
        />
        <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
