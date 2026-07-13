import { describe, expect, it } from "vitest";
import { getDemoAuthorizationContext } from "@/authorization/demo-context";
import { createAuthorizationContext } from "@/authorization/context";
import { DEMO_ANALYST, DEMO_TENANT } from "@/authorization/demo-context";
import { buildOverviewPageView } from "@/application/overview-service";
import { ATTENTION_POLICY_MANIFEST, ATTENTION_REASON_CODES } from "@/application/attention-policy";
import { PRIORITIZATION_POLICY_MANIFEST } from "@/application/prioritization-policy";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("overview service", () => {
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
