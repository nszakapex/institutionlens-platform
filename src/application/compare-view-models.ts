import type {
  CompletenessStatus,
  ConfidenceLevel,
  FreshnessStatus,
  PublicationEligibility,
} from "@/domain/schemas/assessment";
import type { OpportunityContextStatus } from "@/domain/assessments/results";
import type { OrganizationPublicRef } from "@/domain/organization-public-ref";

export type ComparePageState =
  | "empty"
  | "partial"
  | "ready"
  | "unauthorized"
  | "malformed"
  | "not_found"
  | "error";

export type CompareConditionalScoreView = {
  pointsAwarded: number;
  pointsPossible: number;
  bandLabel: string;
  disclosure: string;
};

export type CompareCapabilityColumnView = {
  capabilityName: string;
  statusLabel: string;
  /** Publication-gated; omitted when policy withholds numeric fit. */
  conditionalScore?: CompareConditionalScoreView;
  confidence: ConfidenceLevel;
  freshness: FreshnessStatus;
  assessmentCompleteness: CompletenessStatus;
  publicationEligibility: PublicationEligibility;
};

export type CompareColumnView = {
  displayName: string;
  detailHref: string;
  /** Server-built href that removes this column from the canonical compare URL. */
  removeHref: string;
  publicRef: OrganizationPublicRef;
  organizationType: string;
  lifecycleStatus: string;
  locationLabel: string;
  verticalSummary: string;
  profileSummary: string;
  assessmentStatusLabel: string;
  portfolioName: string;
  conditionalScore?: CompareConditionalScoreView;
  confidence: ConfidenceLevel;
  freshness: FreshnessStatus;
  assessmentCompleteness: CompletenessStatus;
  publicationEligibility: PublicationEligibility;
  opportunityContextStatus: OpportunityContextStatus;
  opportunityContextLabel: string;
  capabilities: readonly CompareCapabilityColumnView[];
  /** Batch 2 fills these; Batch 1 leaves them empty. */
  evidenceCoverageNotes: readonly string[];
  gapNotes: readonly string[];
  overlayNotes: readonly string[];
  differenceNotes: readonly string[];
  warnings: readonly string[];
  synthetic: true;
};

export type CompareMissingSlotView = {
  publicRef: OrganizationPublicRef;
  message: string;
};

export type CompareManifestView = {
  methodologyVersion: string;
  datasetVersion: string;
  asAssessedAt: string;
  syntheticNotice: string;
  maxOrganizations: number;
  minOrganizations: number;
};

export type ComparePageView = {
  state: ComparePageState;
  stateMessage: string;
  /** Canonical shareable path including query when selections exist. */
  compareHref: string;
  selectedRefs: readonly OrganizationPublicRef[];
  columns: readonly CompareColumnView[];
  missing: readonly CompareMissingSlotView[];
  selectionGuidance: string;
  /** Non-recommending contrast copy — Batch 2 expands; Batch 1 may be empty. */
  contrastNotes: readonly string[];
  manifest: CompareManifestView;
};
