import { describe, expect, it } from "vitest";
import {
  isPublicMarketingPath,
  isWorkspacePath,
  shouldApplyRobotsNoIndex,
} from "@/lib/public-paths";
import { DEFAULT_POST_LOGIN_PATH, safeReturnPath } from "@/lib/safe-return-path";

describe("public path classification", () => {
  it("treats marketing routes as public and indexable", () => {
    for (const path of ["/", "/product", "/how-it-works", "/pricing", "/request-access"]) {
      expect(isPublicMarketingPath(path)).toBe(true);
      expect(shouldApplyRobotsNoIndex(path)).toBe(false);
      expect(isWorkspacePath(path)).toBe(false);
    }
  });

  it("keeps workspace, login, and API noindex", () => {
    for (const path of [
      "/app",
      "/organizations",
      "/organizations/acme-bank",
      "/evidence",
      "/documents",
      "/compare",
      "/briefs",
      "/methodology",
      "/settings",
      "/login",
      "/api/health",
    ]) {
      expect(isPublicMarketingPath(path)).toBe(false);
      expect(shouldApplyRobotsNoIndex(path)).toBe(true);
    }
    expect(isWorkspacePath("/app")).toBe(true);
    expect(isWorkspacePath("/login")).toBe(false);
  });
});

describe("safeReturnPath", () => {
  it("defaults to /app", () => {
    expect(safeReturnPath(undefined)).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(safeReturnPath("")).toBe("/app");
    expect(safeReturnPath("https://evil.example/phish")).toBe("/app");
    expect(safeReturnPath("//evil.example")).toBe("/app");
    expect(safeReturnPath("/product")).toBe("/app");
    expect(safeReturnPath("/login")).toBe("/app");
  });

  it("allows workspace-relative paths only", () => {
    expect(safeReturnPath("/app")).toBe("/app");
    expect(safeReturnPath("/organizations")).toBe("/organizations");
    expect(safeReturnPath("/organizations/acme?x=1")).toBe("/organizations/acme");
    expect(safeReturnPath("/briefs/some-brief")).toBe("/briefs/some-brief");
  });
});
