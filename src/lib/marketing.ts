export const MARKETING_NAV = [
  { href: "/product", label: "Product" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/request-access", label: "Request access" },
] as const;

export const marketingMetadataBase = {
  robots: {
    index: true,
    follow: true,
  },
} as const;
