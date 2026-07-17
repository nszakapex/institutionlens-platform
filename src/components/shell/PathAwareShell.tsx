"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";

type AppMode = "local-demo" | "development" | "staging" | "production";

export function PathAwareShell({ children, appMode }: { children: ReactNode; appMode: AppMode }) {
  const pathname = usePathname() || "/";

  return (
    <AppShell currentPath={pathname} appMode={appMode}>
      {children}
    </AppShell>
  );
}
