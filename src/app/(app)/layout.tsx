import type { ReactNode } from "react";
import { PathAwareShell } from "@/components/shell/PathAwareShell";
import { getRequestAccess } from "@/authorization/request-access";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await getRequestAccess();

  return <PathAwareShell>{children}</PathAwareShell>;
}
