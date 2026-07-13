import type { OrganizationPublicRef } from "@/domain/organization-public-ref";
import type { BriefPublicRef } from "@/domain/brief-public-ref";
import type {
  CompletenessStatus,
  ConfidenceLevel,
  FreshnessStatus,
  PublicationEligibility,
} from "@/domain/schemas/assessment";

/** Page-level brief document / directory states. */
export type BriefPageState =
  | "empty"
  | "available"
  | "insufficient_evidence"
  | "not_published"
  | "unauthorized"
  | "not_found"
  | "malformed"
  | "error";

export type BriefObservationClassification =
  | "evidence"
  | "assessment"
  | "gap"
  | "limitation"
  | "unavailable"
  | "not_published";

/** Stable, reviewable observation produced from fixed templates. */
export type BriefObservationView = {
  key: string;
  language: string;
  classification: BriefObservationClassification;
  /** Permitted evidence titles only — never raw evidence IDs. */
  supportingEvidenceTitles: readonly string[];
  /** Permitted provenance display labels only — never raw provenance IDs. */
  supportingProvenanceLabels: readonly string[];
};

export type BriefSectionKey =
  | "identity"
  | "purpose"
  | "profile"
  | "portfolio"
  | "assessment_state"
  | "capabilities"
  | "quality_signals"
  | "evidence_coverage"
  | "provenance"
  | "observations"
  | "gaps"
  | "overlay"
  | "methodology"
  | "disclaimer";

export type BriefSectionView = {
  key: BriefSectionKey;
  title: string;
  summary: string;
  observations: readonly BriefObservationView[];
};

export type BriefManifestView = {
  methodologyVersion: string;
  datasetVersion: string;
  asAssessedAt: string;
  syntheticNotice: string;
  permittedUse: string;
  nonRecommendationDisclaimer: string;
};

/** Directory row — opaque refs and redacted labels only. */
export type BriefDirectoryCandidateView = {
  displayName: string;
  organizationType: string;
  assessmentStatusLabel: string;
  organizationPublicRef: OrganizationPublicRef;
  briefPublicRef: BriefPublicRef;
  briefHref: string;
  selected: boolean;
};

export type BriefDirectoryPageView = {
  state: BriefPageState;
  stateMessage: string;
  selectedOrgRef: OrganizationPublicRef | null;
  selectedBriefHref: string | null;
  candidates: readonly BriefDirectoryCandidateView[];
  selectionGuidance: string;
  manifest: BriefManifestView;
};

export type BriefCapabilitySummaryView = {
  capabilityName: string;
  statusLabel: string;
  confidence: ConfidenceLevel | null;
  freshness: FreshnessStatus | null;
  completeness: CompletenessStatus | null;
  fitBandLabel: string | null;
  pointsAwarded: number | null;
  pointsPossible: number | null;
  publicationEligibility: PublicationEligibility | "unavailable";
  publicationNote: string;
};

export type BriefEvidenceCoverageView = {
  permittedCount: number;
  message: string;
};

export type BriefProvenanceSummaryView = {
  label: string;
  licenseStatusLabel: string;
  accessClassificationLabel: string;
};

export type BriefOverlayView =
  | { access: "restricted" }
  | { access: "omitted"; message: string }
  | {
      access: "available";
      relationshipStatusLabel: string;
      matchStatusLabel: string;
      reviewStatusLabel: string;
      sourceClassificationLabel: string;
      capabilityUsageLabels: readonly string[];
    };

/**
 * Individual brief document projection (Batch 2).
 * Batch 3 owns full document presentation polish.
 */
export type BriefDocumentPageView = {
  state: BriefPageState;
  stateMessage: string;
  briefPublicRef: BriefPublicRef | null;
  organizationPublicRef: OrganizationPublicRef | null;
  displayName: string | null;
  detailHref: string | null;
  directoryHref: string;
  title: string;
  asOfLabel: string | null;
  freshnessStatement: string | null;
  purposeStatement: string;
  sections: readonly BriefSectionView[];
  capabilities: readonly BriefCapabilitySummaryView[];
  evidenceCoverage: BriefEvidenceCoverageView | null;
  provenanceSummaries: readonly BriefProvenanceSummaryView[];
  overlay: BriefOverlayView | null;
  manifest: BriefManifestView;
};

/** Stable section order for every content-bearing brief. */
export const BRIEF_SECTION_ORDER: readonly BriefSectionKey[] = [
  "identity",
  "purpose",
  "profile",
  "portfolio",
  "assessment_state",
  "capabilities",
  "quality_signals",
  "evidence_coverage",
  "provenance",
  "observations",
  "gaps",
  "overlay",
  "methodology",
  "disclaimer",
] as const;
