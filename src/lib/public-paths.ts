/**
 * Path classification for marketing vs workspace privacy/indexing.
 * Keep in sync with route groups under src/app/(marketing) and src/app/(app).
 */

const MARKETING_PREFIXES = ["/product", "/how-it-works", "/pricing", "/request-access"] as const;

const WORKSPACE_PREFIXES = [
  "/app",
  "/organizations",
  "/evidence",
  "/documents",
  "/compare",
  "/briefs",
  "/methodology",
  "/foundation",
  "/settings",
] as const;

function pathnameOnly(pathname: string): string {
  const raw = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (!raw.startsWith("/")) return "/";
  return raw.length > 1 && raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export function isPublicMarketingPath(pathname: string): boolean {
  const path = pathnameOnly(pathname);
  if (path === "/") return true;
  return MARKETING_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function isWorkspacePath(pathname: string): boolean {
  const path = pathnameOnly(pathname);
  return WORKSPACE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function shouldApplyRobotsNoIndex(pathname: string): boolean {
  if (isPublicMarketingPath(pathname)) return false;
  return true;
}

export const PUBLIC_MARKETING_ROUTES = ["/", ...MARKETING_PREFIXES] as const;
