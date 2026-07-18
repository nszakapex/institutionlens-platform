import type { NextConfig } from "next";
import { buildSecurityHeaders, ROBOTS_NOINDEX_VALUE } from "./src/lib/security/headers";

const baselineHeaders = buildSecurityHeaders({
  includeContentSecurityPolicy: false,
  includeRobotsNoIndex: false,
});

const robotsNoIndexHeader = { key: "X-Robots-Tag", value: ROBOTS_NOINDEX_VALUE };

/** Workspace, auth, and API routes retain noindex. Marketing routes omit it. */
const privatePathSources = [
  "/app",
  "/app/:path*",
  "/organizations",
  "/organizations/:path*",
  "/evidence",
  "/evidence/:path*",
  "/compare",
  "/compare/:path*",
  "/briefs",
  "/briefs/:path*",
  "/methodology",
  "/methodology/:path*",
  "/foundation",
  "/foundation/:path*",
  "/settings",
  "/settings/:path*",
  "/login",
  "/login/:path*",
  "/api/:path*",
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: baselineHeaders,
      },
      ...privatePathSources.map((source) => ({
        source,
        headers: [robotsNoIndexHeader],
      })),
    ];
  },
};

export default nextConfig;
