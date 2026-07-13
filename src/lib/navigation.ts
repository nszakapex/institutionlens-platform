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
    available: false,
    description: "Placeholder — bounded comparison arrives later",
  },
  {
    id: "evidence",
    label: "Evidence",
    href: "/evidence",
    available: false,
    description: "Placeholder — evidence ledger arrives later",
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
    available: false,
    description: "Placeholder — methodology surface arrives later",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    available: false,
    description: "Placeholder — vertical and tenant settings arrive later",
  },
] as const;
