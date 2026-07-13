import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

describe("route loading and error boundaries", () => {
  it("provides safe loading copy without fabricated metrics", () => {
    const appLoading = readFileSync(path.join(ROOT, "src/app/(app)/loading.tsx"), "utf8");
    const orgLoading = readFileSync(
      path.join(ROOT, "src/app/(app)/organizations/loading.tsx"),
      "utf8",
    );
    expect(appLoading).toMatch(/LoadingState/);
    expect(appLoading).toMatch(/not fabricated|withheld|when ready/i);
    expect(orgLoading).toMatch(/LoadingState/);
    expect(orgLoading).not.toMatch(/pointsAwarded|portfolioAssessed|\b77\b|\b233\b/);
    expect(appLoading).not.toMatch(/org_syn_fi_|tenant_demo|principal_demo/);

    for (const route of ["organizations/[organizationRef]", "evidence", "methodology"]) {
      const content = readFileSync(path.join(ROOT, `src/app/(app)/${route}/loading.tsx`), "utf8");
      expect(content).toMatch(/LoadingState/);
      expect(content).toMatch(/withheld|when .* ready/i);
      expect(content).not.toMatch(/org_syn_fi_|tenant_demo|principal_demo/);
    }
  });

  it("provides safe error copy with retry navigation and no internals", () => {
    const appError = readFileSync(path.join(ROOT, "src/app/(app)/error.tsx"), "utf8");
    const orgError = readFileSync(path.join(ROOT, "src/app/(app)/organizations/error.tsx"), "utf8");
    for (const content of [appError, orgError]) {
      expect(content).toMatch(/"use client"/);
      expect(content).toMatch(/Retry/);
      expect(content).toMatch(/ErrorState/);
      // Must not render runtime error details into the UI JSX strings.
      expect(content).not.toMatch(/\{error\.message\}|\{error\.stack\}|\{error\.digest\}/);
      expect(content).not.toMatch(/org_syn_fi_|tenant_demo|principal_demo|SELECT /);
      expect(content).not.toMatch(/node_modules|C:\\\\Users/);
    }

    for (const route of ["organizations/[organizationRef]", "evidence", "methodology"]) {
      const content = readFileSync(path.join(ROOT, `src/app/(app)/${route}/error.tsx`), "utf8");
      expect(content).toMatch(/"use client"/);
      expect(content).toMatch(/Retry/);
      expect(content).toMatch(/ErrorState/);
      expect(content).not.toMatch(/\{error\.message\}|\{error\.stack\}|\{error\.digest\}/);
      expect(content).not.toMatch(/org_syn_fi_|tenant_demo|principal_demo|SELECT |node_modules/);
    }
  });

  it("keeps Phase 6 route metadata generic and non-indexable", () => {
    for (const route of ["organizations/[organizationRef]", "evidence", "methodology"]) {
      const content = readFileSync(path.join(ROOT, `src/app/(app)/${route}/page.tsx`), "utf8");
      expect(content).toMatch(/noarchive:\s*true/);
      expect(content).toMatch(/index:\s*false/);
      expect(content).not.toMatch(/generateMetadata|displayName/);
    }
  });
});
