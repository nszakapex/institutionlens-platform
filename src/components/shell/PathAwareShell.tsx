"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";

export function PathAwareShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";

  return <AppShell currentPath={pathname}>{children}</AppShell>;
}
