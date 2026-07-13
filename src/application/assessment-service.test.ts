import { beforeEach, describe, expect, it } from "vitest";
import { getDemoAuthorizationContext } from "@/authorization/demo-context";
import { buildAssessmentFoundationView } from "@/application/assessment-service";
import {
  ASSESSMENT_DIMENSIONS_NOTE,
  ASSESSMENT_HEURISTIC_DISCLAIMER,
  OBSERVED_FIT_BAND_LABELS,
  observedFitBandLabelFor,
} from "@/application/assessment-view-models";
import { __resetSyntheticAssessmentIndexForTests } from "@/repositories/synthetic-assessment-repository";

function setDemoEnv(): void {
  process.env.IL_APP_MODE = "local-demo";
  process.env.IL_DEMO_TENANT_ID = "demo-tenant-local";
  process.env.IL_DEMO_PRINCIPAL_ID = "demo-principal-local";
}

describe("buildAssessmentFoundationView", () => {
  beforeEach(() => {
    setDemoEnv();
    __resetSyntheticAssessmentIndexForTests();
  });

  it("includes synthetic declaration, heuristic disclaimer, and distinct dimension labels", async () => {
    const view = await buildAssessmentFoundationView(getDemoAuthorizationContext());

    expect(view.syntheticDeclaration).toMatch(/entirely synthetic/i);
    expect(view.heuristicDisclaimer).toBe(ASSESSMENT_HEURISTIC_DISCLAIMER);
    expect(view.dimensionsNote).toBe(ASSESSMENT_DIMENSIONS_NOTE);
    expect(view.dimensionsNote).toMatch(/Assessment completeness/i);
    expect(view.dimensionsNote).toMatch(/formal Completeness/i);
    expect(view.dimensionsNote).toMatch(/Evidence-state coverage/i);
    expect(view.organizationCount).toBe(24);
    expect(view.sampleAssessments.length).toBeGreaterThan(0);
    expect(view.sampleAssessments.length).toBeLessThanOrEqual(3);
  });

  it("exposes conditional portfolio coverage disclosure without raw IDs", async () => {
    const view = await buildAssessmentFoundationView(getDemoAuthorizationContext());
    expect(view.samplePortfolioAssessments.length).toBeGreaterThan(0);

    for (const sample of view.samplePortfolioAssessments) {
      expect(sample.coverage.conditionalOnAssessedCapabilities).toBe(true);
      expect(sample.coverage.conditionalScoreDisclosure).toMatch(/Conditional portfolio score/);
      expect(sample.coverage.conditionalScoreDisclosure).toMatch(/capabilities assessed/);
      expect(sample.coverage.conditionalScoreDisclosure).toMatch(/priority weight covered/);
      expect(sample.coverage.enabledCapabilityCount).toBe(5);
      expect(sample.coverage.assessedCapabilityCount).toBeGreaterThan(0);
      expect(sample.coverage.assessedCapabilityCount).toBeLessThanOrEqual(
        sample.coverage.enabledCapabilityCount,
      );
      if (sample.bandLabel) {
        expect(Object.values(OBSERVED_FIT_BAND_LABELS)).toContain(sample.bandLabel);
        expect(sample.bandLabel).not.toMatch(/likely|strong fit|purchase/i);
      }
    }

    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("cap_syn_fi_");
    expect(serialized).not.toContain("org_syn_fi_");
    expect(serialized).toMatch(/Conditional portfolio score/);
  });

  it("does not expose raw tenant IDs, principal IDs, overlay notes, or evidence IDs", async () => {
    const view = await buildAssessmentFoundationView(getDemoAuthorizationContext());
    const serialized = JSON.stringify(view);

    expect(serialized).not.toContain("tenant_demo_research");
    expect(serialized).not.toContain("principal_demo");
    expect(serialized).not.toContain("org_syn_fi_");
    expect(serialized).not.toContain("cap_syn_fi_");
    expect(serialized).not.toContain("ev_syn_fi_");
    expect(serialized).not.toContain("assess_syn_fi_");
    expect(serialized).not.toContain("overlay_syn_fi_");
    expect(serialized).not.toContain("Synthetic prospect flagged");
    expect(serialized).not.toContain("reasonCode");
    expect(serialized).not.toContain("no_overlay");
    expect(serialized).not.toContain("prospect_relationship");

    for (const sample of view.sampleAssessments) {
      expect(sample.orgDisplayName.length).toBeGreaterThan(0);
      expect(sample.capabilityName.length).toBeGreaterThan(0);
      expect(sample.opportunityReasonLabel).not.toMatch(/^[a-z][a-z0-9_]*$/);
      expect(sample.ledgerPreview.length).toBeLessThanOrEqual(5);
      if (sample.bandLabel) {
        expect(Object.values(OBSERVED_FIT_BAND_LABELS)).toContain(sample.bandLabel);
      }
      for (const row of sample.ledgerPreview) {
        expect(row.title.length).toBeGreaterThan(0);
        expect(row.outcomeLabel.length).toBeGreaterThan(0);
        expect(row.reason.length).toBeGreaterThan(0);
        expect(row.sourceExplanation.length).toBeGreaterThan(0);
        expect(row.sourceExplanation).not.toMatch(/ev_syn_|prov_syn_/);
      }
    }
  });
});

describe("observedFitBandLabelFor", () => {
  it("exposes all four honest client-facing observed-alignment labels", () => {
    expect(observedFitBandLabelFor("limited_observed_alignment")).toBe(
      "Limited observed alignment",
    );
    expect(observedFitBandLabelFor("emerging_observed_alignment")).toBe(
      "Emerging observed alignment",
    );
    expect(observedFitBandLabelFor("meaningful_observed_alignment")).toBe(
      "Meaningful observed alignment",
    );
    expect(observedFitBandLabelFor("strong_observed_alignment")).toBe("Strong observed alignment");
    expect(Object.values(OBSERVED_FIT_BAND_LABELS)).toHaveLength(4);
    for (const label of Object.values(OBSERVED_FIT_BAND_LABELS)) {
      expect(label).toMatch(/observed alignment$/i);
      expect(label).not.toMatch(/likely|probability|will buy|strong fit$/i);
    }
  });
});
