import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { assertPermission } from "@/authorization/context";
import type { Organization } from "@/domain/schemas/organization";
import type { EvidenceRecord } from "@/domain/schemas/evidence";
import type { DataClassification } from "@/domain/schemas/common";
import type {
  CapabilityAssessment,
  OpportunityContextStatus,
  PortfolioAssessment,
} from "@/domain/assessments/results";
import type { OrganizationOverlay } from "@/domain/overlays/schemas";
import type { ObservedFitBand } from "@/domain/schemas/assessment";
import {
  conditionalPortfolioScoreDisclosure,
  opportunityReasonLabelFor,
  observedFitBandLabelFor,
} from "@/application/assessment-view-models";
import {
  loadFinancialInstitutionsStore,
  type SyntheticStore,
} from "@/repositories/synthetic-organization-repository";
import { organizationPublicRefFor } from "@/domain/organization-public-ref";
import { generateSyntheticAssessments } from "@/verticals/financial-institutions/assessment/generate";
import { getOverlayForOrg } from "@/verticals/financial-institutions/assessment/synthetic-overlays";
import { FINANCIAL_INSTITUTION_CAPABILITIES } from "@/verticals/financial-institutions/capabilities";
import { SYNTHETIC_FI_PORTFOLIO } from "@/verticals/financial-institutions/assessment/synthetic-portfolio";
import {
  ASSESSED_AT,
  METHODOLOGY_VERSION,
} from "@/verticals/financial-institutions/assessment/methodology";
import {
  DATASET_DECLARATION,
  FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
  FINANCIAL_INSTITUTIONS_FIXTURE_VERSION,
  FinancialInstitutionPayloadSchema,
  type FinancialInstitutionPayload,
} from "@/verticals/financial-institutions/schema";
import { FINANCIAL_INSTITUTIONS_VOCABULARY } from "@/verticals/financial-institutions/vocabulary";
import { AuthorizationError } from "@/domain/errors";
import type { RepositoryBundle } from "@/repositories/repository-contracts";
import { RepositoryError } from "@/repositories/repository-errors";

export type OrgResearchRecord = {
  /** Internal join key — never expose in client view models. */
  organizationId: string;
  /** Public route handle — only expose as part of detail hrefs. */
  publicRef: string;
  displayName: string;
  organizationType: string;
  lifecycleStatus: string;
  locationLabel: string;
  dataClassification: DataClassification;
  tags: readonly string[];
  summary: string;
  verticalLabel: string;
  verticalSummary: string;
  adapterVersion: string;
  payload: FinancialInstitutionPayload;
  searchHaystack: string;
  overlay: OrganizationOverlay | null;
  excluded: boolean;
  ambiguousOverlay: boolean;
  opportunityContextStatus: OpportunityContextStatus;
  opportunityContextLabel: string;
  portfolio: PortfolioAssessment;
  capabilityAssessments: readonly CapabilityAssessment[];
  assessmentOutputFingerprints: readonly string[];
  changeSignals: readonly EvidenceRecord[];
};

export type TenantResearchReadModel = {
  tenantId: string;
  verticalLabel: string;
  methodologyVersion: string;
  datasetVersion: string;
  asAssessedAt: string;
  syntheticNotice: string;
  organizations: readonly OrgResearchRecord[];
  capabilityCatalog: readonly {
    capabilityId: string;
    name: string;
    priority: number;
  }[];
};

function capabilityNameById(capabilityId: string): string {
  return (
    FINANCIAL_INSTITUTION_CAPABILITIES.find((item) => item.id === capabilityId)?.name ??
    "Synthetic capability"
  );
}

function buildVerticalSummary(payload: FinancialInstitutionPayload): string {
  const kind =
    FINANCIAL_INSTITUTIONS_VOCABULARY[
      payload.institutionKind as keyof typeof FINANCIAL_INSTITUTIONS_VOCABULARY
    ] ?? payload.institutionKind;
  const scale =
    FINANCIAL_INSTITUTIONS_VOCABULARY[
      payload.balanceSheetScaleBand as keyof typeof FINANCIAL_INSTITUTIONS_VOCABULARY
    ] ?? payload.balanceSheetScaleBand;
  return `${kind} · ${scale} · ${payload.serviceAreaType.replace(/_/g, " ")}`;
}

function vocabularyLabel(value: string): string {
  const vocab = FINANCIAL_INSTITUTIONS_VOCABULARY as Record<string, string>;
  return vocab[value] ?? value.replace(/_/g, " ");
}

/**
 * Org-level opportunity posture from overlay — never alters fit.
 * Unknown overlay is not counted as new_logo.
 */
export function deriveOrgOpportunityStatus(
  overlay: OrganizationOverlay | null,
  contexts: PortfolioAssessment["opportunityContexts"],
): OpportunityContextStatus {
  if (!overlay) return "unknown";
  if (overlay.relationshipStatus === "excluded") return "excluded";
  if (overlay.relationshipStatus === "prospect") return "new_logo";
  if (overlay.relationshipStatus === "former_client") return "renewal_or_reengagement";
  if (overlay.relationshipStatus === "active_client") {
    if (contexts.some((c) => c.status === "cross_sell")) return "cross_sell";
    if (contexts.some((c) => c.status === "existing_use")) return "existing_use";
    if (contexts.some((c) => c.status === "renewal_or_reengagement")) {
      return "renewal_or_reengagement";
    }
    return "unknown";
  }
  return "unknown";
}

function buildSearchHaystack(org: Organization, payload: FinancialInstitutionPayload): string {
  const parts = [
    org.displayName,
    org.organizationType,
    ...org.tags,
    vocabularyLabel(payload.institutionKind),
    vocabularyLabel(payload.balanceSheetScaleBand),
    vocabularyLabel(payload.regulatoryDataAvailability),
    payload.serviceAreaType,
    payload.ownershipModel,
    payload.digitalServiceMaturity,
    payload.lendingBreadth,
    payload.operatingComplexityBand,
    ...payload.operatingRegions.map(vocabularyLabel),
  ];
  return parts.join(" ").toLowerCase();
}

function buildOrgRecord(
  org: Organization,
  publicRef: string,
  overlay: OrganizationOverlay | null,
  portfolio: PortfolioAssessment,
  capabilityAssessments: readonly CapabilityAssessment[],
  changeSignals: readonly EvidenceRecord[],
  fingerprints: readonly string[],
): OrgResearchRecord {
  const payload = FinancialInstitutionPayloadSchema.parse(org.verticalPayload);
  const opportunityContextStatus = deriveOrgOpportunityStatus(
    overlay,
    portfolio.opportunityContexts,
  );
  return {
    organizationId: org.id,
    publicRef,
    displayName: org.displayName,
    organizationType: org.organizationType,
    lifecycleStatus: org.lifecycleStatus,
    locationLabel:
      org.primaryLocation.localityLabel ?? vocabularyLabel(org.primaryLocation.regionCode),
    dataClassification: org.dataClassification,
    tags: Object.freeze([...org.tags]),
    summary: org.summary,
    verticalLabel: "Financial institutions",
    verticalSummary: buildVerticalSummary(payload),
    adapterVersion: org.adapterVersion,
    payload,
    searchHaystack: buildSearchHaystack(org, payload),
    overlay,
    excluded: overlay?.relationshipStatus === "excluded",
    ambiguousOverlay: overlay?.matchStatus === "ambiguous",
    opportunityContextStatus,
    opportunityContextLabel: opportunityReasonLabelFor(opportunityContextStatus),
    portfolio,
    capabilityAssessments,
    assessmentOutputFingerprints: Object.freeze([...fingerprints]),
    changeSignals,
  };
}

function buildModel(context: AuthorizationContext, store: SyntheticStore): TenantResearchReadModel {
  const bundle = generateSyntheticAssessments();
  const byOrg = new Map(bundle.organizations.map((item) => [item.organizationId, item]));

  const priorityByCap = new Map(
    SYNTHETIC_FI_PORTFOLIO.capabilities.map((c) => [c.capabilityId, c.priority] as const),
  );

  const organizations: OrgResearchRecord[] = [];

  for (const org of store.organizations) {
    if (org.tenantId !== context.tenant.id) continue;
    const assessment = byOrg.get(org.id);
    if (!assessment) continue;

    organizations.push(
      buildOrgRecord(
        org,
        organizationPublicRefFor(org.id),
        getOverlayForOrg(org.id) ?? null,
        assessment.portfolioAssessment,
        assessment.capabilityAssessments,
        store.evidence.filter(
          (item) =>
            item.organizationId === org.id &&
            item.tenantId === context.tenant.id &&
            item.evidenceType === "public_change_signal" &&
            item.publicationEligibility !== "restricted",
        ),
        assessment.manifests.map((item) => item.outputFingerprint),
      ),
    );
  }

  organizations.sort((a, b) => a.displayName.localeCompare(b.displayName, "en"));

  return Object.freeze({
    tenantId: context.tenant.id,
    verticalLabel: "Financial institutions",
    methodologyVersion: METHODOLOGY_VERSION,
    datasetVersion: FINANCIAL_INSTITUTIONS_FIXTURE_VERSION,
    asAssessedAt: ASSESSED_AT,
    syntheticNotice: DATASET_DECLARATION,
    organizations: Object.freeze(organizations),
    capabilityCatalog: Object.freeze(
      SYNTHETIC_FI_PORTFOLIO.capabilities
        .filter((c) => c.status === "enabled")
        .map((c) => ({
          capabilityId: c.capabilityId,
          name: capabilityNameById(c.capabilityId),
          priority: priorityByCap.get(c.capabilityId) ?? c.priority,
        })),
    ),
  });
}

async function listAllOrganizations(
  context: AuthorizationContext,
  repositories: RepositoryBundle,
): Promise<Organization[]> {
  const items: Organization[] = [];
  let page = 1;
  for (;;) {
    const result = await repositories.organizations.list(context, {
      page,
      pageSize: 50,
      sortField: "displayName",
      sortDirection: "asc",
    });
    items.push(...result.items);
    if (items.length >= result.total || result.items.length === 0) break;
    page += 1;
    if (page > 200) throw new RepositoryError("INVALID_RESPONSE");
  }
  return items;
}

async function buildFromRepositories(
  context: AuthorizationContext,
  repositories: RepositoryBundle,
): Promise<TenantResearchReadModel> {
  const orgs = await listAllOrganizations(context, repositories);
  const organizations: OrgResearchRecord[] = [];

  for (const org of orgs) {
    if (org.tenantId !== context.tenant.id) {
      throw new RepositoryError("INVALID_RESPONSE");
    }

    const portfolios = await repositories.assessments.listPortfolioAssessments(context, {
      organizationId: org.id,
      page: 1,
      pageSize: 1,
    });
    const portfolio = portfolios.items[0];
    if (!portfolio) continue;

    const capabilities = await repositories.assessments.listCapabilityAssessments(context, {
      organizationId: org.id,
      page: 1,
      pageSize: 50,
    });

    let overlay: OrganizationOverlay | null = null;
    if (context.permissions.includes("overlay:read")) {
      try {
        overlay = await repositories.overlays.getByOrganizationId(context, org.id);
      } catch (error) {
        if (!(error instanceof RepositoryError) || error.code !== "NOT_FOUND") throw error;
      }
    }

    const evidence = await repositories.organizations.listEvidence(context, org.id, {
      page: 1,
      pageSize: 50,
    });
    const changeSignals = evidence.items.filter(
      (item) =>
        item.evidenceType === "public_change_signal" &&
        item.publicationEligibility !== "restricted",
    );

    const fingerprints: string[] = [];
    try {
      const manifest = await repositories.assessments.getAssessmentManifest(context, portfolio.id);
      fingerprints.push(manifest.outputFingerprint);
    } catch (error) {
      if (!(error instanceof RepositoryError) || error.code !== "NOT_FOUND") throw error;
    }

    organizations.push(
      buildOrgRecord(
        org,
        organizationPublicRefFor(org.id),
        overlay,
        portfolio,
        capabilities.items,
        changeSignals,
        fingerprints,
      ),
    );
  }

  organizations.sort((a, b) => a.displayName.localeCompare(b.displayName, "en"));

  const priorityByCap = new Map(
    SYNTHETIC_FI_PORTFOLIO.capabilities.map((c) => [c.capabilityId, c.priority] as const),
  );
  const assessedAt =
    organizations
      .map((item) => item.portfolio.assessedAt)
      .sort()
      .at(-1) ?? ASSESSED_AT;

  return Object.freeze({
    tenantId: context.tenant.id,
    verticalLabel: "Financial institutions",
    methodologyVersion: METHODOLOGY_VERSION,
    datasetVersion: FINANCIAL_INSTITUTIONS_FIXTURE_VERSION,
    asAssessedAt: assessedAt,
    syntheticNotice: "Persisted tenant research data — not a synthetic local demo dataset.",
    organizations: Object.freeze(organizations),
    capabilityCatalog: Object.freeze(
      SYNTHETIC_FI_PORTFOLIO.capabilities
        .filter((c) => c.status === "enabled")
        .map((c) => ({
          capabilityId: c.capabilityId,
          name: capabilityNameById(c.capabilityId),
          priority: priorityByCap.get(c.capabilityId) ?? c.priority,
        })),
    ),
  });
}

/**
 * Build a tenant-scoped normalized research read model.
 * Authorization is checked before any join.
 * No request/global memoization — avoids cross-tenant leakage and authz reuse.
 * Live mode requires an injected supabase-postgres repository bundle (no silent synthetic fallback).
 */
export async function getTenantResearchReadModel(
  context: AuthorizationContext,
  repositories?: RepositoryBundle,
): Promise<TenantResearchReadModel> {
  assertPermission(context, "organization:read");
  assertPermission(context, "assessment:read");

  if (context.tenant.status !== "active" || context.principal.status !== "active") {
    throw new AuthorizationError("Authorization context is not active.");
  }

  if (repositories?.adapter === "supabase-postgres") {
    return buildFromRepositories(context, repositories);
  }

  if (repositories && repositories.adapter !== "synthetic") {
    throw new RepositoryError("MISCONFIGURED");
  }

  const store = loadFinancialInstitutionsStore();
  return buildModel(context, store);
}

export function scoreCoverageRatio(record: OrgResearchRecord): number {
  const enabled = record.portfolio.coverage.enabledPriorityWeight;
  if (enabled <= 0) return 0;
  return record.portfolio.coverage.assessedPriorityWeight / enabled;
}

export function bandLabel(band: ObservedFitBand): string {
  return observedFitBandLabelFor(band);
}

export function conditionalDisclosure(record: OrgResearchRecord): string {
  return conditionalPortfolioScoreDisclosure(record.portfolio.coverage);
}

export function insufficientReasonCodes(record: OrgResearchRecord): string[] {
  const codes = new Set<string>();
  for (const assessment of record.capabilityAssessments) {
    if (assessment.fit.status !== "insufficient_evidence") continue;
    for (const entry of assessment.ledger) {
      if (entry.outcome === "not_evaluated_missing") codes.add("missing_evidence");
      if (entry.outcome === "not_evaluated_stale") codes.add("stale_evidence");
      if (entry.outcome === "not_evaluated_restricted") codes.add("restricted_evidence");
      if (entry.outcome === "blocked_by_gate") codes.add("evidence_gate");
    }
  }
  if (codes.size === 0) codes.add("insufficient_evidence");
  return [...codes].sort();
}

export function reasonSummaryFromCodes(codes: readonly string[]): string {
  const labels: Record<string, string> = {
    missing_evidence: "Missing required evidence",
    stale_evidence: "Stale supporting evidence",
    restricted_evidence: "Restricted evidence unavailable for scoring",
    evidence_gate: "Evidence gate not satisfied",
    insufficient_evidence: "Insufficient evidence for portfolio assessment",
  };
  return codes.map((code) => labels[code] ?? code).join("; ");
}

export function isCompatibleAdapter(record: OrgResearchRecord): boolean {
  return record.adapterVersion === FINANCIAL_INSTITUTIONS_ADAPTER_VERSION;
}

export { capabilityNameById };
