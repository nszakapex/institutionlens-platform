import { describe, expect, it } from "vitest";
import { aggregatePortfolioAssessment } from "@/assessment/aggregate";
import { deriveOpportunityContext } from "@/assessment/opportunity";
import type { CapabilityAssessment } from "@/domain/assessments/results";
import type { CapabilityPortfolio } from "@/domain/portfolios/schemas";
import type { OrganizationOverlay } from "@/domain/overlays/schemas";

const ASSESSED_AT = "2026-04-01T12:00:00.000Z";
const TENANT = "tenant_demo_research" as const;
const ORG = "org_syn_test_001" as const;
const PORTFOLIO = "portfolio_syn_test_demo" as const;
const CAP_A = "cap_syn_test_ops" as const;
const CAP_B = "cap_syn_test_risk" as const;

function portfolio(overrides: Partial<CapabilityPortfolio> = {}): CapabilityPortfolio {
  return {
    id: PORTFOLIO,
    tenantId: TENANT,
    verticalId: "test_vertical",
    adapterVersion: "1.0.0",
    schemaVersion: "1.0.0",
    catalogVersion: "1.0.0",
    name: "Synthetic test portfolio",
    description: "Synthetic portfolio for aggregation tests.",
    status: "active",
    synthetic: true,
    createdAt: ASSESSED_AT,
    updatedAt: ASSESSED_AT,
    capabilities: [
      {
        capabilityId: CAP_A,
        status: "enabled",
        priority: 1,
        ruleSetId: "ruleset_syn_test_ops",
        ruleSetVersion: "1.0.0",
      },
      {
        capabilityId: CAP_B,
        status: "enabled",
        priority: 3,
        ruleSetId: "ruleset_syn_test_risk",
        ruleSetVersion: "1.0.0",
      },
    ],
    aggregationPolicy: {
      kind: "priority_weighted_average",
      minAssessedCapabilityRatio: "0.50",
      insufficientPortfolioRatio: "0.75",
      version: "1.0.0",
    },
    assessmentPolicy: {
      confidencePolicyVersion: "1.0.0",
      freshnessPolicyVersion: "1.0.0",
      completenessPolicyVersion: "1.0.0",
      version: "1.0.0",
    },
    publicationPolicy: {
      defaultEligibility: "internal_only",
      allowInferencePublication: false,
      requireProvenanceForVerified: true,
      unknownLicenseBlocksPublication: true,
    },
    ...overrides,
  };
}

function capabilityAssessment(
  overrides: Partial<CapabilityAssessment> & {
    id: CapabilityAssessment["id"];
    capabilityId: CapabilityAssessment["capabilityId"];
  },
): CapabilityAssessment {
  return {
    tenantId: TENANT,
    organizationId: ORG,
    portfolioId: PORTFOLIO,
    verticalId: "test_vertical",
    ruleSetId: "ruleset_syn_test_ops",
    ruleSetVersion: "1.0.0",
    schemaVersion: "1.0.0",
    fit: {
      status: "assessed",
      pointsAwarded: 50,
      pointsPossible: 100,
      band: "emerging_observed_alignment",
    },
    confidence: "moderate",
    freshness: "current",
    completeness: "sufficient",
    publicationEligibility: "internal_only",
    ledger: [],
    assessedAt: ASSESSED_AT,
    engineVersion: "1.0.0",
    synthetic: true,
    ...overrides,
  };
}

function overlay(overrides: Partial<OrganizationOverlay> = {}): OrganizationOverlay {
  return {
    id: "overlay_syn_test_001",
    tenantId: TENANT,
    organizationId: ORG,
    schemaVersion: "1.0.0",
    synthetic: true,
    relationshipStatus: "prospect",
    capabilityUsage: [],
    matchStatus: "exact",
    reviewStatus: "reviewed",
    sourceClassification: "synthetic_demo",
    effectiveAt: ASSESSED_AT,
    updatedAt: ASSESSED_AT,
    ...overrides,
  };
}

describe("aggregatePortfolioAssessment", () => {
  it("computes priority-weighted portfolio score with normalized weights", () => {
    const assessments = [
      capabilityAssessment({
        id: "assess_syn_test_a",
        capabilityId: CAP_A,
        fit: {
          status: "assessed",
          pointsAwarded: 100,
          pointsPossible: 100,
          band: "strong_observed_alignment",
        },
      }),
      capabilityAssessment({
        id: "assess_syn_test_b",
        capabilityId: CAP_B,
        ruleSetId: "ruleset_syn_test_risk",
        fit: {
          status: "assessed",
          pointsAwarded: 0,
          pointsPossible: 100,
          band: "limited_observed_alignment",
        },
      }),
    ];

    const result = aggregatePortfolioAssessment({
      assessmentId: "assess_syn_test_portfolio",
      tenantId: TENANT,
      organizationId: ORG,
      portfolio: portfolio(),
      capabilityAssessments: assessments,
      overlay: null,
      assessedAt: ASSESSED_AT,
    });

    // score = floor(((1*100)+(3*0))*100 / ((1*100)+(3*100))) = floor(10000/400) = 25
    expect(result.status).toBe("assessed");
    expect(result.portfolioPriorityScore).toEqual({
      pointsAwarded: 25,
      pointsPossible: 100,
      band: "emerging_observed_alignment",
    });
    expect(result.contributions.map((entry) => entry.weight)).toEqual(["0.25000000", "0.75000000"]);
    expect(result.bestObservedCapabilityFit?.capabilityId).toBe(CAP_A);
  });

  it("does not let overlays change fit scores", () => {
    const assessments = [
      capabilityAssessment({
        id: "assess_syn_test_a",
        capabilityId: CAP_A,
        fit: {
          status: "assessed",
          pointsAwarded: 80,
          pointsPossible: 100,
          band: "strong_observed_alignment",
        },
      }),
      capabilityAssessment({
        id: "assess_syn_test_b",
        capabilityId: CAP_B,
        ruleSetId: "ruleset_syn_test_risk",
        fit: {
          status: "assessed",
          pointsAwarded: 40,
          pointsPossible: 100,
          band: "emerging_observed_alignment",
        },
      }),
    ];

    const withoutOverlay = aggregatePortfolioAssessment({
      assessmentId: "assess_syn_test_portfolio",
      tenantId: TENANT,
      organizationId: ORG,
      portfolio: portfolio(),
      capabilityAssessments: assessments,
      overlay: null,
      assessedAt: ASSESSED_AT,
    });

    const withOverlay = aggregatePortfolioAssessment({
      assessmentId: "assess_syn_test_portfolio",
      tenantId: TENANT,
      organizationId: ORG,
      portfolio: portfolio(),
      capabilityAssessments: assessments,
      overlay: overlay({
        relationshipStatus: "active_client",
        capabilityUsage: [
          { capabilityId: CAP_A, usageStatus: "not_used" },
          { capabilityId: CAP_B, usageStatus: "active" },
        ],
      }),
      assessedAt: ASSESSED_AT,
    });

    expect(withOverlay.portfolioPriorityScore).toEqual(withoutOverlay.portfolioPriorityScore);
    expect(withOverlay.contributions.map((entry) => entry.fit)).toEqual(
      withoutOverlay.contributions.map((entry) => entry.fit),
    );
    expect(withOverlay.opportunityContexts).toEqual([
      deriveOpportunityContext(
        overlay({
          relationshipStatus: "active_client",
          capabilityUsage: [
            { capabilityId: CAP_A, usageStatus: "not_used" },
            { capabilityId: CAP_B, usageStatus: "active" },
          ],
        }),
        CAP_A,
      ),
      deriveOpportunityContext(
        overlay({
          relationshipStatus: "active_client",
          capabilityUsage: [
            { capabilityId: CAP_A, usageStatus: "not_used" },
            { capabilityId: CAP_B, usageStatus: "active" },
          ],
        }),
        CAP_B,
      ),
    ]);
    expect(withoutOverlay.opportunityContexts.every((entry) => entry.status === "unknown")).toBe(
      true,
    );
  });

  it("renormalizes portfolio score over assessed capabilities only while keeping insufficient rows visible", () => {
    // CAP_A priority 1 @ 100/100 assessed; CAP_B priority 3 insufficient → excluded from score denom
    // score = floor((1*100)*100 / (1*100)) = 100 (assessed-only), not diluted by CAP_B
    const result = aggregatePortfolioAssessment({
      assessmentId: "assess_syn_test_portfolio",
      tenantId: TENANT,
      organizationId: ORG,
      portfolio: portfolio({
        aggregationPolicy: {
          kind: "priority_weighted_average",
          minAssessedCapabilityRatio: "0.40",
          insufficientPortfolioRatio: "0.75",
          version: "1.0.0",
        },
      }),
      capabilityAssessments: [
        capabilityAssessment({
          id: "assess_syn_test_a",
          capabilityId: CAP_A,
          fit: {
            status: "assessed",
            pointsAwarded: 100,
            pointsPossible: 100,
            band: "strong_observed_alignment",
          },
        }),
        capabilityAssessment({
          id: "assess_syn_test_b",
          capabilityId: CAP_B,
          ruleSetId: "ruleset_syn_test_risk",
          fit: { status: "insufficient_evidence" },
        }),
      ],
      overlay: null,
      assessedAt: ASSESSED_AT,
    });

    expect(result.status).toBe("assessed");
    expect(result.portfolioPriorityScore).toEqual({
      pointsAwarded: 100,
      pointsPossible: 100,
      band: "strong_observed_alignment",
    });
    expect(result.coverage).toEqual({
      enabledCapabilityCount: 2,
      assessedCapabilityCount: 1,
      insufficientCapabilityCount: 1,
      enabledPriorityWeight: 4,
      assessedPriorityWeight: 1,
      conditionalOnAssessedCapabilities: true,
    });

    const byId = Object.fromEntries(
      result.contributions.map((entry) => [entry.capabilityId, entry] as const),
    );
    expect(byId[CAP_A]?.includedInAggregate).toBe(true);
    expect(byId[CAP_B]?.includedInAggregate).toBe(false);
    expect(byId[CAP_B]?.fit.status).toBe("insufficient_evidence");
    // Contribution weights remain relative to all enabled priorities (1+3=4)
    expect(byId[CAP_A]?.weight).toBe("0.25000000");
    expect(byId[CAP_B]?.weight).toBe("0.75000000");

    const assessedPriority = result.contributions
      .filter((entry) => entry.includedInAggregate)
      .reduce((sum, entry) => sum + entry.priority, 0);
    const totalPriority = result.contributions.reduce((sum, entry) => sum + entry.priority, 0);
    expect(assessedPriority).toBe(1);
    expect(totalPriority).toBe(4);
  });

  it("returns insufficient_evidence when too many capabilities lack evidence", () => {
    const result = aggregatePortfolioAssessment({
      assessmentId: "assess_syn_test_portfolio",
      tenantId: TENANT,
      organizationId: ORG,
      portfolio: portfolio(),
      capabilityAssessments: [
        capabilityAssessment({
          id: "assess_syn_test_a",
          capabilityId: CAP_A,
          fit: { status: "insufficient_evidence" },
        }),
        capabilityAssessment({
          id: "assess_syn_test_b",
          capabilityId: CAP_B,
          fit: { status: "invalid" },
        }),
      ],
      overlay: null,
      assessedAt: ASSESSED_AT,
    });

    expect(result.status).toBe("insufficient_evidence");
    expect(result.portfolioPriorityScore).toBeNull();
  });
});
