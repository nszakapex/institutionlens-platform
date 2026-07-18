"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export function MarketingShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";

  return (
    <div className="il-mkt-shell">
      <MarketingHeader currentPath={pathname} />
      <div className="il-mkt-body">{children}</div>
      <MarketingFooter />
    </div>
  );
}
