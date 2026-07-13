import { describe, expect, it } from "vitest";
import { deriveOpportunityContext } from "@/assessment/opportunity";
import type { OrganizationOverlay } from "@/domain/overlays/schemas";

const ASSESSED_AT = "2026-04-01T12:00:00.000Z";
const CAP = "cap_syn_test_ops" as const;

function overlay(overrides: Partial<OrganizationOverlay> = {}): OrganizationOverlay {
  return {
    id: "overlay_syn_test_001",
    tenantId: "tenant_demo_research",
    organizationId: "org_syn_test_001",
    schemaVersion: "1.0.0",
    synthetic: true,
    relationshipStatus: "unknown",
    capabilityUsage: [],
    matchStatus: "unreviewed",
    reviewStatus: "unreviewed",
    sourceClassification: "synthetic_demo",
    effectiveAt: ASSESSED_AT,
    updatedAt: ASSESSED_AT,
    ...overrides,
  };
}

describe("deriveOpportunityContext", () => {
  it("returns unknown when overlay is absent", () => {
    expect(deriveOpportunityContext(null, CAP)).toEqual({
      status: "unknown",
      reasonCode: "no_overlay",
      capabilityId: CAP,
    });
  });

  it("returns excluded for explicit exclusion", () => {
    expect(deriveOpportunityContext(overlay({ relationshipStatus: "excluded" }), CAP)).toEqual({
      status: "excluded",
      reasonCode: "explicit_exclusion",
      capabilityId: CAP,
    });
  });

  it("returns new_logo for prospect relationships", () => {
    expect(deriveOpportunityContext(overlay({ relationshipStatus: "prospect" }), CAP)).toEqual({
      status: "new_logo",
      reasonCode: "prospect_relationship",
      capabilityId: CAP,
    });
  });

  it("returns cross_sell for active client with unused capability", () => {
    expect(
      deriveOpportunityContext(
        overlay({
          relationshipStatus: "active_client",
          capabilityUsage: [{ capabilityId: CAP, usageStatus: "not_used" }],
        }),
        CAP,
      ),
    ).toEqual({
      status: "cross_sell",
      reasonCode: "active_client_not_used",
      capabilityId: CAP,
    });
  });

  it("returns existing_use for active client with active usage", () => {
    expect(
      deriveOpportunityContext(
        overlay({
          relationshipStatus: "active_client",
          capabilityUsage: [{ capabilityId: CAP, usageStatus: "active" }],
        }),
        CAP,
      ),
    ).toEqual({
      status: "existing_use",
      reasonCode: "active_client_active_usage",
      capabilityId: CAP,
    });
  });

  it("returns renewal_or_reengagement for former client", () => {
    expect(deriveOpportunityContext(overlay({ relationshipStatus: "former_client" }), CAP)).toEqual(
      {
        status: "renewal_or_reengagement",
        reasonCode: "former_relationship_or_usage",
        capabilityId: CAP,
      },
    );
  });

  it("returns renewal_or_reengagement for former usage", () => {
    expect(
      deriveOpportunityContext(
        overlay({
          relationshipStatus: "active_client",
          capabilityUsage: [{ capabilityId: CAP, usageStatus: "former" }],
        }),
        CAP,
      ),
    ).toEqual({
      status: "renewal_or_reengagement",
      reasonCode: "former_relationship_or_usage",
      capabilityId: CAP,
    });
  });

  it("returns unknown when signals are insufficient", () => {
    expect(deriveOpportunityContext(overlay({ relationshipStatus: "unknown" }), CAP)).toEqual({
      status: "unknown",
      reasonCode: "insufficient_overlay_signal",
      capabilityId: CAP,
    });
  });
});
