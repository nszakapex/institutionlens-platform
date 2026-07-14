import { beforeEach, describe, expect, it } from "vitest";
import { getDemoAuthorizationContext } from "@/authorization/demo-context";
import { createAuthorizationContext } from "@/authorization/context";
import { DEMO_ANALYST, DEMO_TENANT } from "@/authorization/demo-context";
import { permissionsForRole } from "@/authorization/policy";
import { buildOverviewPageView } from "@/application/overview-service";
import { ATTENTION_POLICY_MANIFEST, ATTENTION_REASON_CODES } from "@/application/attention-policy";
import { PRIORITIZATION_POLICY_MANIFEST } from "@/application/prioritization-policy";
import { readFileSync } from "node:fs";
import path from "node:path";

function setDemoEnv(): void {
  process.env.IL_APP_MODE = "local-demo";
  process.env.IL_DEMO_TENANT_ID = "demo-tenant-local";
  process.env.IL_DEMO_PRINCIPAL_ID = "demo-principal-local";
}

describe("overview service", () => {
  beforeEach(() => {
    setDemoEnv();
  });
  it("derives exact universe partition counts", async () => {
    const view = await buildOverviewPageView(getDemoAuthorizationContext());
    expect(view.state).toBe("ready");
    expect(view.universe).toEqual({
      totalOrganizations: 24,
      portfolioAssessed: 16,
      portfolioInsufficientEvidence: 8,
      capabilityAssessments: 120,
      capabilityAssessed: 77,
      capabilityInsufficientEvidence: 43,
      synthetic: true,
    });
  });

  it("keeps insufficient evidence out of fit bands and sums assessed buckets", async () => {
    const view = await buildOverviewPageView(getDemoAuthorizationContext());
    const bandTotal = view.alignmentDistribution.assessedBuckets.reduce(
      (sum, b) => sum + b.count,
      0,
    );
    expect(bandTotal).toBe(view.alignmentDistribution.assessedTotal);
    expect(view.alignmentDistribution.assessedTotal).toBe(16);
    expect(view.alignmentDistribution.insufficientEvidenceCount).toBe(8);
    expect(bandTotal + view.alignmentDistribution.insufficientEvidenceCount).toBe(24);
  });

  it("builds a bounded shortlist without excluded orgs or numeric IDs", async () => {
    const view = await buildOverviewPageView(getDemoAuthorizationContext());
    expect(view.shortlist.rows.length).toBeLessThanOrEqual(8);
    expect(view.shortlist.rows.length).toBeGreaterThan(0);
    for (const row of view.shortlist.rows) {
      expect(row.conditionalScore.disclosure.length).toBeGreaterThan(0);
      expect(JSON.stringify(row)).not.toMatch(/org_syn_fi_|tenant_|principal_|overlay_/);
      expect(row.opportunityContextStatus).not.toBe("excluded");
    }
  });

  it("exposes opaque Compare inbound hrefs into partial selection state", async () => {
    const view = await buildOverviewPageView(getDemoAuthorizationContext());
    expect(view.state).toBe("ready");
    expect(view.shortlist.rows.length).toBeGreaterThan(0);
    for (const row of view.shortlist.rows) {
      expect(row.compareHref).toMatch(/^\/compare\?org=oref_[a-f0-9]{16,32}$/);
      expect(row.compareActionLabel).toBe(`Add ${row.displayName} to comparison`);
      expect(row.compareHref).not.toMatch(/org_syn_fi_|tenant_|principal_/);
      const ref = new URL(row.compareHref, "https://example.test").searchParams.get("org");
      expect(row.detailHref).toBe(`/organizations/${ref}`);
      expect(row.briefHref).toMatch(/^\/briefs\/bref_[a-f0-9]{16,32}$/);
      expect(row.briefActionLabel).toBe(`Open institutional brief for ${row.displayName}`);
      expect(row.briefHref).not.toMatch(/org_syn_fi_|tenant_|principal_/);
      expect(row.briefActionLabel).not.toMatch(/available|insufficient|not published/i);
    }
  });

  it("omits Compare inbound actions when overview is unauthorized", async () => {
    const context = createAuthorizationContext(DEMO_TENANT, DEMO_ANALYST, ["organization:read"]);
    const view = await buildOverviewPageView(context);
    expect(view.state).toBe("unauthorized");
    expect(view.shortlist.rows).toHaveLength(0);
    expect(JSON.stringify(view)).not.toMatch(/compareHref|\/compare\?org=/);
    expect(JSON.stringify(view)).not.toMatch(/briefHref|\/briefs\/bref_/);
  });

  it("omits Brief inbound actions when brief:read is missing", async () => {
    const context = createAuthorizationContext(
      DEMO_TENANT,
      DEMO_ANALYST,
      permissionsForRole("analyst").filter((item) => item !== "brief:read"),
    );
    const view = await buildOverviewPageView(context);
    expect(view.state).toBe("ready");
    expect(view.shortlist.rows.length).toBeGreaterThan(0);
    for (const row of view.shortlist.rows) {
      expect(row.briefHref).toBeNull();
      expect(row.briefActionLabel).toBeNull();
      expect(row.compareHref).toMatch(/^\/compare\?org=/);
    }
    expect(JSON.stringify(view)).not.toMatch(/\/briefs\/bref_/);
  });

  it("shows evidence review without numeric scores", async () => {
    const view = await buildOverviewPageView(getDemoAuthorizationContext());
    expect(view.evidenceReview.total).toBe(8);
    expect(view.evidenceReview.rows.length).toBeLessThanOrEqual(8);
    for (const row of view.evidenceReview.rows) {
      expect(JSON.stringify(row)).not.toMatch(/pointsAwarded|portfolioPriorityScore/);
      expect(row.reasonSummary.length).toBeGreaterThan(0);
    }
  });

  it("builds a deterministic bounded attention queue covering policy reasons", async () => {
    const view = await buildOverviewPageView(getDemoAuthorizationContext());
    expect(view.attention.items.length).toBeLessThanOrEqual(10);
    expect(view.attention.total).toBeGreaterThanOrEqual(view.attention.items.length);
    const codes = new Set(view.attention.items.map((item) => item.reasonCode));
    expect(codes.size).toBeGreaterThan(0);
    for (const item of view.attention.items) {
      expect(ATTENTION_REASON_CODES).toContain(item.reasonCode);
      expect(item.humanReason.length).toBeGreaterThan(0);
      expect(item.actionLabel.length).toBeGreaterThan(0);
    }
  });

  it("summarizes capability opportunities without treating unknown as new_logo", async () => {
    const view = await buildOverviewPageView(getDemoAuthorizationContext());
    expect(view.capabilityOpportunities).toHaveLength(5);
    for (const row of view.capabilityOpportunities) {
      expect(row.assessedCount + row.insufficientCount).toBeLessThanOrEqual(24);
      expect(row.opportunityContexts.unknown).toBeGreaterThanOrEqual(0);
      expect(row.synthetic).toBe(true);
    }
  });

  it("bounds publication-safe change signals", async () => {
    const view = await buildOverviewPageView(getDemoAuthorizationContext());
    expect(view.changeSignals.rows.length).toBeLessThanOrEqual(5);
    for (const row of view.changeSignals.rows) {
      expect(row.changeLabel.length).toBeGreaterThan(0);
      expect(JSON.stringify(row)).not.toMatch(/ev_|prov_|restricted source/);
    }
  });

  it("fails closed without assessment permission", async () => {
    const context = createAuthorizationContext(DEMO_TENANT, DEMO_ANALYST, ["organization:read"]);
    const view = await buildOverviewPageView(context);
    expect(view.state).toBe("unauthorized");
  });
});

describe("prioritization and attention manifests", () => {
  it("keeps policy manifests versioned and free of score thresholds", () => {
    expect(PRIORITIZATION_POLICY_MANIFEST.version).toBe("1.0.0");
    expect(PRIORITIZATION_POLICY_MANIFEST.shortlistMaxRows).toBe(8);
    expect(JSON.stringify(PRIORITIZATION_POLICY_MANIFEST)).not.toMatch(/pointsPossible|threshold/);
    expect(ATTENTION_POLICY_MANIFEST.version).toBe("1.0.0");
    expect(ATTENTION_POLICY_MANIFEST.reasonCodes).toEqual(ATTENTION_REASON_CODES);
  });

  it("matches documented policy versions in source", () => {
    const policy = readFileSync(
      path.join(process.cwd(), "src/application/prioritization-policy.ts"),
      "utf8",
    );
    expect(policy).toContain('PRIORITIZATION_POLICY_VERSION = "1.0.0"');
    const attention = readFileSync(
      path.join(process.cwd(), "src/application/attention-policy.ts"),
      "utf8",
    );
    expect(attention).toContain('ATTENTION_POLICY_VERSION = "1.0.0"');
  });
});
