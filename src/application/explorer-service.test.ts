import { beforeEach, describe, expect, it } from "vitest";
import { getDemoAuthorizationContext } from "@/authorization/demo-context";
import { createAuthorizationContext } from "@/authorization/context";
import { DEMO_ANALYST, DEMO_TENANT } from "@/authorization/demo-context";
import { buildExplorerPageView } from "@/application/explorer-service";
import { defaultExplorerQuery, parseExplorerSearchParams } from "@/application/explorer-query";

function setDemoEnv(): void {
  process.env.IL_APP_MODE = "local-demo";
  process.env.IL_DEMO_TENANT_ID = "demo-tenant-local";
  process.env.IL_DEMO_PRINCIPAL_ID = "demo-principal-local";
}

describe("explorer query validation", () => {
  beforeEach(() => {
    setDemoEnv();
  });
  it("parses defaults", () => {
    const parsed = parseExplorerSearchParams({});
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.query).toEqual(defaultExplorerQuery());
    expect(parsed.query.exclusionPolicy).toBe("hide_excluded");
    expect(parsed.query.sort).toBe("observed_alignment_desc");
    expect(parsed.query.pageSize).toBe(12);
  });

  it("rejects invalid page size and sort", () => {
    expect(parseExplorerSearchParams({ pageSize: "50" }).ok).toBe(false);
    expect(parseExplorerSearchParams({ sort: "hot_leads" }).ok).toBe(false);
    expect(parseExplorerSearchParams({ page: "0" }).ok).toBe(false);
  });

  it("normalizes search text and bounds length", () => {
    const parsed = parseExplorerSearchParams({ q: "  Northbridge   Example  " });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.query.text).toBe("Northbridge Example");
    expect(parseExplorerSearchParams({ q: "x".repeat(101) }).ok).toBe(false);
  });

  it("maps safe capability URL values to internal filters without exposing catalog IDs", () => {
    const parsed = parseExplorerSearchParams({
      capabilityId: ["operational-analytics-support", "data-quality-modernization"],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.query.capabilityId).toEqual([
      "cap_syn_fi_data_quality",
      "cap_syn_fi_ops_analytics",
    ]);
  });

  it("records unknown params without accepting them as filters", () => {
    const parsed = parseExplorerSearchParams({ bogus: "1", q: "Cedar" });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.unknownParams).toContain("bogus");
    expect(parsed.query.text).toBe("Cedar");
  });
});

describe("explorer service", () => {
  beforeEach(() => {
    setDemoEnv();
  });

  it("returns default explorer results without excluded orgs", async () => {
    const view = await buildExplorerPageView(getDemoAuthorizationContext(), {});
    expect(view.state).toBe("ready");
    expect(view.totalCount).toBeLessThanOrEqual(23);
    expect(view.combinedRows.length).toBeLessThanOrEqual(12);
    expect(view.activeFilters.some((f) => f.label.includes("Excluded hidden"))).toBe(true);
  });

  it("emits safe capability filter values in client-facing view models", async () => {
    const view = await buildExplorerPageView(getDemoAuthorizationContext(), {
      capabilityId: "operational-analytics-support",
    });
    expect(view.state).toBe("ready");
    expect(view.facets.capabilities.map((item) => item.value)).toContain(
      "operational-analytics-support",
    );
    expect(view.formValues.capabilityId).toEqual(["operational-analytics-support"]);
    expect(JSON.stringify(view)).not.toMatch(/cap_syn_fi_/);
  });

  it("searches by synthetic display name", async () => {
    const view = await buildExplorerPageView(getDemoAuthorizationContext(), { q: "Northbridge" });
    expect(view.state).toBe("ready");
    expect(view.totalCount).toBeGreaterThan(0);
    expect(view.combinedRows.every((row) => row.displayName.includes("Northbridge"))).toBe(true);
  });

  it("applies FI adapter filters", async () => {
    const view = await buildExplorerPageView(getDemoAuthorizationContext(), {
      institutionKind: "synthetic_credit_union",
    });
    expect(view.state).toBe("ready");
    expect(view.totalCount).toBeGreaterThan(0);
    expect(view.totalCount).toBeLessThan(24);
  });

  it("separates assessed and insufficient for score sorts", async () => {
    const view = await buildExplorerPageView(getDemoAuthorizationContext(), {
      sort: "observed_alignment_desc",
      pageSize: "24",
    });
    expect(view.useAssessedInsufficientSplit).toBe(true);
    for (const row of view.insufficientSection) {
      expect(row.conditionalScore).toBeUndefined();
      expect(row.portfolioAssessmentStatus).toMatch(
        /Insufficient|insufficient|Unassessed|unassessed|Invalid|invalid/i,
      );
    }
    for (const row of view.assessedSection) {
      expect(row.conditionalScore).toBeDefined();
      expect(row.conditionalScore?.disclosure.length).toBeGreaterThan(0);
    }
  });

  it("paginates stably and preserves query", async () => {
    const page1 = await buildExplorerPageView(getDemoAuthorizationContext(), {
      pageSize: "12",
      page: "1",
    });
    const page2 = await buildExplorerPageView(getDemoAuthorizationContext(), {
      pageSize: "12",
      page: "2",
    });
    expect(page1.pagination.nextHref).toContain("page=2");
    const names1 = new Set(page1.combinedRows.map((r) => r.displayName));
    for (const row of page2.combinedRows) {
      expect(names1.has(row.displayName)).toBe(false);
    }
  });

  it("returns beyond-range state without silent page swap", async () => {
    const view = await buildExplorerPageView(getDemoAuthorizationContext(), {
      page: "99",
      pageSize: "12",
    });
    expect(view.state).toBe("beyond_range");
    expect(view.pagination.recoveryHref).toBeTruthy();
    expect(view.combinedRows).toHaveLength(0);
  });

  it("supports include-excluded policy", async () => {
    const hidden = await buildExplorerPageView(getDemoAuthorizationContext(), {
      exclusionPolicy: "hide_excluded",
    });
    const shown = await buildExplorerPageView(getDemoAuthorizationContext(), {
      exclusionPolicy: "include_excluded",
    });
    expect(shown.totalCount).toBeGreaterThanOrEqual(hidden.totalCount);
  });

  it("produces zero-result recovery path", async () => {
    const view = await buildExplorerPageView(getDemoAuthorizationContext(), {
      q: "zzz-no-such-org",
    });
    expect(view.state).toBe("no_search_results");
    expect(view.clearAllHref).toBe("/organizations");
  });

  it("redacts internal identifiers from result rows", async () => {
    const view = await buildExplorerPageView(getDemoAuthorizationContext(), { pageSize: "24" });
    const payload = JSON.stringify(view.combinedRows);
    expect(payload).not.toMatch(/org_syn_fi_|tenant_local|principal_|ev_syn_|prov_syn_|overlay_/);
    expect(payload).not.toMatch(/Synthetic prospect flagged|private note/i);
  });

  it("exposes opaque Compare inbound hrefs that open partial comparison state", async () => {
    const view = await buildExplorerPageView(getDemoAuthorizationContext(), {
      assessmentStatus: ["assessed"],
      pageSize: "12",
    });
    expect(view.state).toBe("ready");
    expect(view.combinedRows.length).toBeGreaterThan(0);
    for (const row of view.combinedRows) {
      expect(row.compareHref).toMatch(/^\/compare\?org=oref_[a-f0-9]{16,32}$/);
      expect(row.compareActionLabel).toContain(row.displayName);
      expect(row.compareActionLabel).toMatch(/comparison/i);
      expect(row.compareHref).not.toMatch(/org_syn_fi_|cap_syn_|tenant_/);
    }
    // Filtered explorer href remains shareable independently of Compare.
    expect(view.clearAllHref).toBe("/organizations");
  });

  it("omits Compare inbound hrefs when explorer is unauthorized", async () => {
    const context = createAuthorizationContext(DEMO_TENANT, DEMO_ANALYST, []);
    const view = await buildExplorerPageView(context, {});
    expect(view.state).toBe("unauthorized");
    expect(view.combinedRows).toHaveLength(0);
    expect(JSON.stringify(view)).not.toMatch(/compareHref|\/compare\?org=/);
  });

  it("fails closed without permissions", async () => {
    const context = createAuthorizationContext(DEMO_TENANT, DEMO_ANALYST, []);
    const view = await buildExplorerPageView(context, {});
    expect(view.state).toBe("unauthorized");
  });
});

describe("explorer multi-select", () => {
  beforeEach(() => {
    setDemoEnv();
  });

  it("ORs two values within one filter group", async () => {
    const view = await buildExplorerPageView(getDemoAuthorizationContext(), {
      assessmentStatus: ["assessed", "insufficient_evidence"],
      pageSize: "48",
    });
    expect(view.state).toBe("ready");
    expect(view.totalCount).toBeGreaterThan(0);
    const statuses = new Set(view.combinedRows.map((row) => row.portfolioAssessmentStatus));
    expect(statuses.has("Assessed") || statuses.has("Insufficient evidence")).toBe(true);
  });

  it("ANDs across different filter groups", async () => {
    const orOnly = await buildExplorerPageView(getDemoAuthorizationContext(), {
      assessmentStatus: ["assessed"],
      pageSize: "48",
    });
    const anded = await buildExplorerPageView(getDemoAuthorizationContext(), {
      assessmentStatus: ["assessed"],
      confidence: ["high"],
      pageSize: "48",
    });
    expect(anded.totalCount).toBeLessThanOrEqual(orOnly.totalCount);
    expect(anded.combinedRows.every((row) => row.confidence === "high")).toBe(true);
  });

  it("preserves multi-select values through pagination links", async () => {
    const view = await buildExplorerPageView(getDemoAuthorizationContext(), {
      assessmentStatus: ["assessed", "insufficient_evidence"],
      pageSize: "12",
      page: "1",
    });
    expect(view.pagination.nextHref).toMatch(/assessmentStatus=assessed/);
    expect(view.pagination.nextHref).toMatch(/assessmentStatus=insufficient_evidence/);
    expect(view.pagination.nextHref).toMatch(/page=2/);
  });

  it("removes one chip while preserving other selected values", async () => {
    const view = await buildExplorerPageView(getDemoAuthorizationContext(), {
      confidence: ["high", "moderate"],
    });
    const highChip = view.activeFilters.find((chip) => chip.key === "confidence:high");
    expect(highChip).toBeTruthy();
    expect(highChip!.removeHref).toMatch(/confidence=moderate/);
    expect(highChip!.removeHref).not.toMatch(/confidence=high/);
  });

  it("Clear All href restores excluded-hidden default", async () => {
    const view = await buildExplorerPageView(getDemoAuthorizationContext(), {
      assessmentStatus: ["assessed"],
      exclusionPolicy: "include_excluded",
    });
    expect(view.clearAllHref).toBe("/organizations");
  });

  it("dedupes duplicate multi-select values deterministically", () => {
    const parsed = parseExplorerSearchParams({
      confidence: ["high", "high", "moderate", "high"],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.query.confidence).toEqual(["high", "moderate"]);
  });

  it("fails safely on excess multi-select values", () => {
    const values = Array.from({ length: 9 }, (_, i) => `band_${i}`);
    const parsed = parseExplorerSearchParams({ organizationType: values });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.issues.some((issue) => issue.startsWith("excess:"))).toBe(true);
  });

  it("does not accept tenant override via query params", async () => {
    const view = await buildExplorerPageView(getDemoAuthorizationContext(), {
      tenantId: "tenant_other",
      assessmentStatus: ["assessed"],
    } as Record<string, string | string[] | undefined>);
    expect(view.unknownParams).toContain("tenantId");
    expect(view.state).toBe("ready");
    expect(JSON.stringify(view.combinedRows)).not.toMatch(/tenant_/);
  });

  it("multi-select does not alter Phase 4 conditional scores", async () => {
    const baseline = await buildExplorerPageView(getDemoAuthorizationContext(), {
      assessmentStatus: ["assessed"],
      pageSize: "48",
      sort: "name_asc",
    });
    const filtered = await buildExplorerPageView(getDemoAuthorizationContext(), {
      assessmentStatus: ["assessed"],
      confidence: ["high", "moderate", "low", "unknown"],
      pageSize: "48",
      sort: "name_asc",
    });
    const byName = new Map(
      baseline.combinedRows
        .filter((row) => row.conditionalScore)
        .map((row) => [row.displayName, row.conditionalScore] as const),
    );
    for (const row of filtered.combinedRows) {
      if (!row.conditionalScore) continue;
      expect(row.conditionalScore).toEqual(byName.get(row.displayName));
    }
  });

  it("supports multi-select FI adapter filters with OR semantics", async () => {
    const view = await buildExplorerPageView(getDemoAuthorizationContext(), {
      institutionKind: ["synthetic_bank", "synthetic_credit_union"],
      pageSize: "48",
    });
    expect(view.state).toBe("ready");
    expect(view.totalCount).toBeGreaterThan(0);
    expect(view.formValues.institutionKind).toEqual(["synthetic_bank", "synthetic_credit_union"]);
  });
});
