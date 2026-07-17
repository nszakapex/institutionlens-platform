import type { ReactNode } from "react";
import { PathAwareShell } from "@/components/shell/PathAwareShell";
import { getRequestAccess } from "@/authorization/request-access";
import { loadRepositoryConfig } from "@/repositories/repository-config";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await getRequestAccess();
  const appMode = loadRepositoryConfig().mode;

  return <PathAwareShell appMode={appMode}>{children}</PathAwareShell>;
}
