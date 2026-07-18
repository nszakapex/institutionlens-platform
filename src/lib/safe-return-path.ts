/**
 * Guards post-login return paths against open redirects.
 * Only same-origin relative workspace paths are accepted.
 */

import { isWorkspacePath } from "@/lib/public-paths";

export const DEFAULT_POST_LOGIN_PATH = "/app";

export function safeReturnPath(raw: string | null | undefined): string {
  if (typeof raw !== "string") return DEFAULT_POST_LOGIN_PATH;

  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return DEFAULT_POST_LOGIN_PATH;
  if (trimmed.startsWith("//") || trimmed.includes("\\") || trimmed.includes("\n")) {
    return DEFAULT_POST_LOGIN_PATH;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return DEFAULT_POST_LOGIN_PATH;

  const pathOnly = trimmed.split("?")[0]?.split("#")[0] ?? "";
  if (!isWorkspacePath(pathOnly)) return DEFAULT_POST_LOGIN_PATH;

  // Drop query/hash — return targets are path-only workspace routes.
  return pathOnly;
}
