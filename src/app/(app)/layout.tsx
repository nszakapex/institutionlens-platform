import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PathAwareShell } from "@/components/shell/PathAwareShell";
import { AccessPendingScreen } from "@/components/auth/AccessPendingScreen";
import { getRequestAccess } from "@/authorization/request-access";
import { AuthorizationError } from "@/domain/errors";
import { loadRepositoryConfig } from "@/repositories/repository-config";
import { safeReturnPath } from "@/lib/safe-return-path";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const headerStore = await headers();
  const requestedPath = headerStore.get("x-il-pathname") ?? "/app";

  try {
    await getRequestAccess();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      if (error.message === "unauthenticated") {
        const returnTo = safeReturnPath(requestedPath);
        redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      }
      return <AccessPendingScreen />;
    }
    throw error;
  }

  const appMode = loadRepositoryConfig().mode;
  return <PathAwareShell appMode={appMode}>{children}</PathAwareShell>;
}
