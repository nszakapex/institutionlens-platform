export type NavItem = {
  id: string;
  label: string;
  href: string;
  available: boolean;
  description: string;
};

export const PRIMARY_NAV: readonly NavItem[] = [
  {
    id: "overview",
    label: "Overview",
    href: "/app",
    available: true,
    description: "Portfolio overview and prioritization heuristics",
  },
  {
    id: "organizations",
    label: "Organizations",
    href: "/organizations",
    available: true,
    description: "Searchable synthetic organization explorer",
  },
  {
    id: "compare",
    label: "Compare",
    href: "/compare",
    available: true,
    description: "Bounded side-by-side comparison of up to three organizations",
  },
  {
    id: "evidence",
    label: "Evidence",
    href: "/evidence",
    available: true,
    description: "Synthetic evidence and provenance catalog",
  },
  {
    id: "documents",
    label: "Documents",
    href: "/documents",
    available: true,
    description: "Tenant document vault for research uploads",
  },
  {
    id: "briefs",
    label: "Briefs",
    href: "/briefs",
    available: true,
    description: "Synthetic institutional briefs for research preparation",
  },
  {
    id: "methodology",
    label: "Methodology",
    href: "/methodology",
    available: true,
    description: "Versioned synthetic assessment methodology",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    available: true,
    description: "Workspace readiness and document vault settings",
  },
] as const;
