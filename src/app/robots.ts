import type { MetadataRoute } from "next";

/**
 * Marketing routes may be crawled. Workspace, login, and API remain disallowed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/product", "/how-it-works", "/pricing", "/request-access"],
      disallow: [
        "/app",
        "/organizations",
        "/evidence",
        "/compare",
        "/briefs",
        "/methodology",
        "/foundation",
        "/settings",
        "/login",
        "/api",
      ],
    },
  };
}
