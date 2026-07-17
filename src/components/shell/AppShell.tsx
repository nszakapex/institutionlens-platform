import type { ReactNode } from "react";
import { ProductHeader } from "@/components/shell/ProductHeader";

type AppMode = "local-demo" | "development" | "staging" | "production";

type Props = {
  children: ReactNode;
  currentPath: string;
  appMode: AppMode;
  rail?: ReactNode;
};

function environmentCopy(appMode: AppMode): {
  bannerTitle: string;
  bannerMeta: string;
  footer: string;
} {
  if (appMode === "local-demo") {
    return {
      bannerTitle: "Synthetic demo foundation",
      bannerMeta: "Non-production local-demo principal · No real organization data",
      footer:
        "Environment: local-demo. Data status: synthetic fixtures only. Production deployment is not permitted while demo authentication is in place.",
    };
  }
  if (appMode === "staging") {
    return {
      bannerTitle: "Staging live repository path",
      bannerMeta: "Authenticated session · Synthetic fixture data only · No customer data",
      footer:
        "Environment: staging. Data status: live repository/RPC path (non-synthetic adapter). Production deployment is not permitted from this mode.",
    };
  }
  if (appMode === "development") {
    return {
      bannerTitle: "Development live repository path",
      bannerMeta: "Authenticated session · Non-production data only",
      footer:
        "Environment: development. Data status: live repository/RPC path (non-synthetic adapter). Production deployment is not permitted from this mode.",
    };
  }
  return {
    bannerTitle: "Production",
    bannerMeta: "Authenticated session",
    footer:
      "Environment: production. Fit, confidence, freshness, completeness, and publication eligibility remain separate judgments.",
  };
}

export function AppShell({ children, currentPath, appMode, rail }: Props) {
  const copy = environmentCopy(appMode);

  return (
    <div className="il-app-shell">
      <div className="il-demo-banner" role="status">
        <div className="il-demo-banner-inner">
          <strong>{copy.bannerTitle}</strong>
          <span>{copy.bannerMeta}</span>
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
          <p>{copy.footer}</p>
          <p>
            Fit, confidence, freshness, completeness, and publication eligibility remain separate
            judgments.
          </p>
        </div>
      </footer>
    </div>
  );
}
