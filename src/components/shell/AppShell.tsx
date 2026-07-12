import type { ReactNode } from "react";
import { ProductHeader } from "@/components/shell/ProductHeader";

type Props = {
  children: ReactNode;
  currentPath: string;
  rail?: ReactNode;
};

export function AppShell({ children, currentPath, rail }: Props) {
  return (
    <div className="il-app-shell">
      <div className="il-demo-banner" role="status">
        <div className="il-demo-banner-inner">
          <strong>Synthetic demo foundation</strong>
          <span>Non-production local-demo principal</span>
          <span>No real organization data</span>
        </div>
      </div>

      <ProductHeader currentPath={currentPath} />

      <div className={["il-shell-body", rail ? "has-rail" : ""].filter(Boolean).join(" ")}>
        <main id="main" className="il-main" tabIndex={-1}>
          {children}
        </main>
        {rail ? (
          <aside className="il-rail" aria-label="Context">
            {rail}
          </aside>
        ) : null}
      </div>

      <footer className="il-footer">
        <div className="il-footer-inner">
          <p>
            Environment: local-demo. Data status: synthetic fixtures only. Production deployment is
            not permitted while demo authentication is in place.
          </p>
          <p>
            Fit, confidence, freshness, completeness, and publication eligibility remain separate
            judgments.
          </p>
        </div>
      </footer>
    </div>
  );
}
