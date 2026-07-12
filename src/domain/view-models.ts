import type { Organization } from "@/domain/schemas/organization";
import type { EvidenceRecord } from "@/domain/schemas/evidence";
import type { Capability } from "@/domain/schemas/capability";
import type {
  CompletenessStatus,
  ConfidenceLevel,
  FreshnessStatus,
  PublicationEligibility,
} from "@/domain/schemas/assessment";
import type { EpistemicStatus } from "@/domain/schemas/evidence";

/** Client-safe organization summary — no raw tenant ID, no vertical payload. */
export type OrganizationSummaryView = {
  id: string;
  displayName: string;
  organizationType: string;
  verticalLabel: string;
  regionLabel: string;
  lifecycleStatus: string;
  synthetic: true;
  fitStatus: "unassessed";
  tags: readonly string[];
};

export type EvidenceSummaryView = {
  id: string;
  title: string;
  epistemicStatus: string;
  freshness: FreshnessStatus;
  confidence: ConfidenceLevel;
  publicationEligibility: PublicationEligibility;
  synthetic: true;
};

export type CapabilitySummaryView = {
  id: string;
  name: string;
  category: string;
  status: string;
  synthetic: true;
};

/**
 * Counts of synthetic evidence records by epistemicStatus.
 * This is NOT formal Completeness, fit, or confidence.
 */
export type EvidenceStateCoverage = {
  label: "Evidence-state coverage";
  definition: string;
  byEpistemicStatus: Readonly<Record<EpistemicStatus, number>>;
};

export type DomainFoundationView = {
  declaration: string;
  verifiedClarification: string;
  adapter: {
    verticalId: string;
    version: string;
    displayName: string;
    registered: true;
  };
  organizationCount: number;
  sampleOrganizations: readonly OrganizationSummaryView[];
  evidence: {
    total: number;
    byFreshness: Readonly<Record<FreshnessStatus, number>>;
    byPublication: Readonly<Record<PublicationEligibility, number>>;
    evidenceStateCoverage: EvidenceStateCoverage;
  };
  /** Formal Completeness dimension — unassigned in Phase 3. */
  formalCompleteness: Extract<CompletenessStatus, "unknown">;
  fitStatus: "unassessed";
  tenantDisplayName: string;
};

export const SYNTHETIC_VERIFIED_CLARIFICATION =
  "“Verified” means a synthetic record satisfies InstitutionLens provenance and validation requirements inside this demo dataset. It does not mean a real institution, event, source, or claim has been independently verified. All Phase 3 records remain synthetic.";

export const EVIDENCE_STATE_COVERAGE_DEFINITION =
  "Absolute counts of synthetic evidence records grouped by epistemicStatus. Denominator is the tenant-scoped evidence total shown above. This is not formal Completeness, fit, confidence, or a quality score.";

export function toOrganizationSummaryView(
  org: Organization,
  verticalLabel: string,
): OrganizationSummaryView {
  return {
    id: org.id,
    displayName: org.displayName,
    organizationType: org.organizationType,
    verticalLabel,
    regionLabel: org.primaryLocation.localityLabel ?? org.primaryLocation.regionCode,
    lifecycleStatus: org.lifecycleStatus,
    synthetic: true,
    fitStatus: "unassessed",
    tags: Object.freeze([...org.tags]),
  };
}

export function toEvidenceSummaryView(evidence: EvidenceRecord): EvidenceSummaryView {
  return {
    id: evidence.id,
    title: evidence.title,
    epistemicStatus: evidence.epistemicStatus,
    freshness: evidence.freshness,
    confidence: evidence.confidence,
    publicationEligibility: evidence.publicationEligibility,
    synthetic: true,
  };
}

export function toCapabilitySummaryView(capability: Capability): CapabilitySummaryView {
  return {
    id: capability.id,
    name: capability.name,
    category: capability.category,
    status: capability.status,
    synthetic: true,
  };
}
