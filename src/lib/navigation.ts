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
    description: "Design system and shell preview",
  },
  {
    id: "organizations",
    label: "Organizations",
    href: "/organizations",
    available: true,
    description: "Placeholder — organization explorer arrives later",
  },
  {
    id: "compare",
    label: "Compare",
    href: "/compare",
    available: true,
    description: "Placeholder — bounded comparison arrives later",
  },
  {
    id: "evidence",
    label: "Evidence",
    href: "/evidence",
    available: true,
    description: "Placeholder — evidence and provenance arrive later",
  },
  {
    id: "briefs",
    label: "Briefs",
    href: "/briefs",
    available: true,
    description: "Placeholder — research brief library arrives later",
  },
  {
    id: "methodology",
    label: "Methodology",
    href: "/methodology",
    available: true,
    description: "Placeholder — versioned methodology arrives later",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    available: true,
    description: "Placeholder — vertical and tenant settings arrive later",
  },
] as const;
