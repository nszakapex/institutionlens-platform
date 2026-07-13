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

/** Fixed difference states — never ranking or recommendation language. */
export type CompareDifferenceState = "same" | "different" | "unavailable" | "not_comparable";

export const COMPARE_DIFFERENCE_STATE_LABELS: Readonly<Record<CompareDifferenceState, string>> =
  Object.freeze({
    same: "Same published value",
    different: "Different published values",
    unavailable: "Value unavailable for one or more organizations",
    not_comparable: "Not comparable under current publication or assessment rules",
  });

export type CompareDifferenceCellView = {
  displayName: string;
  publicRef: OrganizationPublicRef;
  valueLabel: string;
};

export type CompareDifferenceRowView = {
  dimensionKey: string;
  dimensionLabel: string;
  state: CompareDifferenceState;
  stateLabel: string;
  cells: readonly CompareDifferenceCellView[];
};

export type CompareCapabilityEvidenceView = {
  capabilityName: string;
  /** Count of evidence titles the viewer is permitted to know about. */
  publishedEvidenceCount: number;
  provenanceSummary: string;
  assessmentStatusLabel: string;
  gapLabel: string;
};

/**
 * Overlay projection. When access is restricted, no further fields are present so
 * unauthorized callers cannot infer whether overlay rows exist.
 */
export type CompareOverlayProjectionView =
  | { access: "restricted" }
  | { access: "omitted"; summary: string }
  | {
      access: "available";
      relationshipStatusLabel: string;
      matchStatusLabel: string;
      reviewStatusLabel: string;
      sourceClassificationLabel: string;
      capabilityUsageLabels: readonly string[];
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
  evidenceByCapability: readonly CompareCapabilityEvidenceView[];
  gapIndicators: readonly string[];
  overlay: CompareOverlayProjectionView;
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
  /** Deterministic cross-organization difference rows (Batch 2). */
  differences: readonly CompareDifferenceRowView[];
  /** Non-recommending contrast copy. */
  contrastNotes: readonly string[];
  manifest: CompareManifestView;
};
