import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { assertPermission } from "@/authorization/context";
import type { DomainFoundationView } from "@/domain/view-models";
import {
  EVIDENCE_STATE_COVERAGE_DEFINITION,
  SYNTHETIC_VERIFIED_CLARIFICATION,
  toOrganizationSummaryView,
} from "@/domain/view-models";
import type { FreshnessStatus, PublicationEligibility } from "@/domain/schemas/assessment";
import type { EpistemicStatus } from "@/domain/schemas/evidence";
import {
  loadFinancialInstitutionsStore,
  type SyntheticStore,
} from "@/repositories/synthetic-organization-repository";
import { listRegisteredAdapters, resolveAdapter } from "@/verticals/registry";
import { DATASET_DECLARATION } from "@/verticals/financial-institutions/schema";

function emptyFreshness(): Record<FreshnessStatus, number> {
  return { unknown: 0, current: 0, aging: 0, stale: 0 };
}

function emptyPublication(): Record<PublicationEligibility, number> {
  return {
    restricted: 0,
    internal_only: 0,
    review_required: 0,
    eligible: 0,
  };
}

function emptyEpistemic(): Record<EpistemicStatus, number> {
  return {
    verified: 0,
    calculated: 0,
    rule_based: 0,
    inference: 0,
    missing: 0,
    stale: 0,
  };
}

export function buildDomainFoundationView(
  context: AuthorizationContext,
  store: SyntheticStore = loadFinancialInstitutionsStore(),
): DomainFoundationView {
  assertPermission(context, "organization:read");
  assertPermission(context, "evidence:read");

  const adapterMeta = listRegisteredAdapters().find((item) => item.id === "financial_institutions");
  if (!adapterMeta) {
    throw new Error("financial_institutions adapter missing from registry");
  }

  const adapter = resolveAdapter(adapterMeta.id, adapterMeta.version);
  const organizations = store.organizations.filter((org) => org.tenantId === context.tenant.id);
  const evidence = store.evidence.filter((item) => item.tenantId === context.tenant.id);

  const byFreshness = emptyFreshness();
  const byPublication = emptyPublication();
  const byEpistemicStatus = emptyEpistemic();
  for (const item of evidence) {
    byFreshness[item.freshness] += 1;
    byPublication[item.publicationEligibility] += 1;
    byEpistemicStatus[item.epistemicStatus] += 1;
  }

  const sample = organizations
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, 3)
    .map((org) => toOrganizationSummaryView(org, adapter.organizationNoun));

  return {
    declaration: DATASET_DECLARATION,
    verifiedClarification: SYNTHETIC_VERIFIED_CLARIFICATION,
    adapter: {
      verticalId: adapterMeta.id,
      version: adapterMeta.version,
      displayName: adapterMeta.displayName,
      registered: true,
    },
    organizationCount: organizations.length,
    sampleOrganizations: Object.freeze(sample),
    evidence: {
      total: evidence.length,
      byFreshness: Object.freeze(byFreshness),
      byPublication: Object.freeze(byPublication),
      evidenceStateCoverage: {
        label: "Evidence-state coverage",
        definition: EVIDENCE_STATE_COVERAGE_DEFINITION,
        byEpistemicStatus: Object.freeze(byEpistemicStatus),
      },
    },
    formalCompleteness: "unknown",
    fitStatus: "unassessed",
    tenantDisplayName: context.tenant.displayName,
  };
}
