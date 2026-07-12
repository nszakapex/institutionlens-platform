import type { ReactNode } from "react";
import { PathAwareShell } from "@/components/shell/PathAwareShell";
import { getDemoPrincipal } from "@/lib/demo-tenant";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: ReactNode }) {
  getDemoPrincipal();

  return <PathAwareShell>{children}</PathAwareShell>;
}
