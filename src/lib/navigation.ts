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
    href: "/",
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
    id: "briefs",
    label: "Briefs",
    href: "/briefs",
    available: false,
    description: "Placeholder — research brief library arrives later",
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
    available: false,
    description: "Placeholder — vertical and tenant settings arrive later",
  },
] as const;
