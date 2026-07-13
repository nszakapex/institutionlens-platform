import "server-only";

import { DEMO_DOMAIN_TENANT_ID } from "@/domain/demo-constants";
import type { OrganizationId } from "@/domain/ids";
import { OrganizationOverlaySchema, type OrganizationOverlay } from "@/domain/overlays/schemas";
import { assertNoPiiPatterns } from "@/domain/overlays/invariants";

const EFFECTIVE = "2026-02-15T12:00:00.000Z";
const UPDATED = "2026-03-01T15:30:00.000Z";

type OverlaySeed = {
  n: number;
  relationshipStatus: OrganizationOverlay["relationshipStatus"];
  matchStatus: OrganizationOverlay["matchStatus"];
  reviewStatus: OrganizationOverlay["reviewStatus"];
  capabilityUsage: OrganizationOverlay["capabilityUsage"];
  notes?: string;
};

/**
 * Deliberate subset of synthetic overlays — not every organization has one.
 * Notes are short synthetic text without emails or phone numbers.
 */
const OVERLAY_SEEDS: readonly OverlaySeed[] = [
  {
    n: 1,
    relationshipStatus: "prospect",
    matchStatus: "exact",
    reviewStatus: "reviewed",
    capabilityUsage: [],
    notes: "Synthetic prospect flagged for new-logo opportunity path.",
  },
  {
    n: 2,
    relationshipStatus: "active_client",
    matchStatus: "exact",
    reviewStatus: "reviewed",
    capabilityUsage: [
      { capabilityId: "cap_syn_fi_ops_analytics", usageStatus: "active" },
      { capabilityId: "cap_syn_fi_data_quality", usageStatus: "not_used" },
    ],
    notes: "Active client with ops in use and data-quality unused.",
  },
  {
    n: 4,
    relationshipStatus: "active_client",
    matchStatus: "probable",
    reviewStatus: "needs_attention",
    capabilityUsage: [{ capabilityId: "cap_syn_fi_governance_review", usageStatus: "evaluating" }],
    notes: "Synthetic restricted-path client retained for internal review.",
  },
  {
    n: 5,
    relationshipStatus: "former_client",
    matchStatus: "exact",
    reviewStatus: "reviewed",
    capabilityUsage: [{ capabilityId: "cap_syn_fi_governance_review", usageStatus: "former" }],
    notes: "Former client with prior governance usage for renewal path.",
  },
  {
    n: 8,
    relationshipStatus: "excluded",
    matchStatus: "rejected",
    reviewStatus: "reviewed",
    capabilityUsage: [],
    notes: "Explicit synthetic exclusion for opportunity filtering.",
  },
  {
    n: 10,
    relationshipStatus: "unknown",
    matchStatus: "unreviewed",
    reviewStatus: "unreviewed",
    capabilityUsage: [],
  },
  {
    n: 12,
    relationshipStatus: "active_client",
    matchStatus: "ambiguous",
    reviewStatus: "needs_attention",
    capabilityUsage: [{ capabilityId: "cap_syn_fi_ops_analytics", usageStatus: "unknown" }],
    notes: "Ambiguous match retained for review workflow testing.",
  },
  {
    n: 15,
    relationshipStatus: "prospect",
    matchStatus: "probable",
    reviewStatus: "reviewed",
    capabilityUsage: [],
    notes: "Additional prospect for new-logo variety.",
  },
  {
    n: 20,
    relationshipStatus: "active_client",
    matchStatus: "exact",
    reviewStatus: "reviewed",
    capabilityUsage: [{ capabilityId: "cap_syn_fi_portfolio_reporting", usageStatus: "not_used" }],
    notes: "Active client with portfolio reporting unused for cross-sell.",
  },
  {
    n: 24,
    relationshipStatus: "active_client",
    matchStatus: "exact",
    reviewStatus: "reviewed",
    capabilityUsage: [{ capabilityId: "cap_syn_fi_scenario_planning", usageStatus: "evaluating" }],
    notes: "Active client evaluating scenario-planning support.",
  },
];

function pad(n: number): string {
  return String(n).padStart(3, "0");
}

function buildOverlay(seed: OverlaySeed): OrganizationOverlay {
  const key = pad(seed.n);
  const overlay = OrganizationOverlaySchema.parse({
    id: `overlay_syn_fi_${key}`,
    tenantId: DEMO_DOMAIN_TENANT_ID,
    organizationId: `org_syn_fi_${key}`,
    schemaVersion: "1.0.0",
    synthetic: true,
    relationshipStatus: seed.relationshipStatus,
    capabilityUsage: seed.capabilityUsage,
    matchStatus: seed.matchStatus,
    reviewStatus: seed.reviewStatus,
    sourceClassification: "synthetic_demo",
    effectiveAt: EFFECTIVE,
    updatedAt: UPDATED,
    ...(seed.notes ? { notes: seed.notes } : {}),
  });
  assertNoPiiPatterns(overlay);
  return overlay;
}

export const SYNTHETIC_FI_OVERLAYS: readonly OrganizationOverlay[] = Object.freeze(
  OVERLAY_SEEDS.map(buildOverlay),
);

const BY_ORG = new Map(
  SYNTHETIC_FI_OVERLAYS.map((overlay) => [overlay.organizationId, overlay] as const),
);

export function getOverlayForOrg(orgId: OrganizationId | string): OrganizationOverlay | undefined {
  return BY_ORG.get(orgId);
}
