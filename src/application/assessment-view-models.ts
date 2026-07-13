import type {
  CompletenessStatus,
  ConfidenceLevel,
  FreshnessStatus,
  ObservedFitBand,
  PublicationEligibility,
} from "@/domain/schemas/assessment";
import type { OpportunityContextStatus } from "@/domain/assessments/results";

/** Safe ledger preview row — title + human outcome only; no evidence IDs or reason codes. */
export type LedgerPreviewRow = {
  title: string;
  outcomeLabel: string;
  pointsAwarded: number;
  maximumPoints: number;
  reason: string;
  /** Sanitized lineage explanation — never raw evidence or provenance IDs. */
  sourceExplanation: string;
};

/**
 * Tenant-safe capability assessment summary for UI.
 * No raw tenant IDs, principal IDs, overlay notes, provenance refs, evidence IDs, or rule IDs.
 */
export type CapabilityAssessmentSummaryView = {
  orgDisplayName: string;
  capabilityName: string;
  fitStatus: string;
  pointsAwarded?: number;
  pointsPossible?: number;
  band?: ObservedFitBand;
  /** Client-facing observed-alignment label. */
  bandLabel?: string;
  confidence: ConfidenceLevel;
  freshness: FreshnessStatus;
  assessmentCompleteness: CompletenessStatus;
  publicationEligibility: PublicationEligibility;
  opportunityContextStatus?: OpportunityContextStatus;
  /** Human-readable opportunity label — never a machine reason code. */
  opportunityReasonLabel: string;
  ledgerPreview: readonly LedgerPreviewRow[];
};

export type PortfolioCoverageView = {
  enabledCapabilityCount: number;
  assessedCapabilityCount: number;
  insufficientCapabilityCount: number;
  enabledPriorityWeight: number;
  assessedPriorityWeight: number;
  conditionalOnAssessedCapabilities: true;
  /** Safe disclosure sentence for assessed-subset scoring. */
  conditionalScoreDisclosure: string;
};

export type PortfolioAssessmentSummaryView = {
  orgDisplayName: string;
  portfolioName: string;
  statusLabel: string;
  pointsAwarded?: number;
  pointsPossible?: number;
  bandLabel?: string;
  coverage: PortfolioCoverageView;
  confidence: ConfidenceLevel;
  freshness: FreshnessStatus;
  assessmentCompleteness: CompletenessStatus;
  publicationEligibility: PublicationEligibility;
};

/**
 * Phase 4 assessment foundation preview — heuristic system, not deal prediction.
 */
export type AssessmentFoundationView = {
  engineVersion: string;
  methodologyLabel: string;
  methodologyVersion: string;
  organizationCount: number;
  assessedCapabilityCount: number;
  insufficientEvidenceCount: number;
  sampleAssessments: readonly CapabilityAssessmentSummaryView[];
  samplePortfolioAssessments: readonly PortfolioAssessmentSummaryView[];
  heuristicDisclaimer: string;
  syntheticDeclaration: string;
  /** Clarifies assessment completeness vs organization formal completeness vs evidence-state coverage. */
  dimensionsNote: string;
};

export type PortfolioSummaryView = {
  name: string;
  description: string;
  status: string;
  capabilityCount: number;
  enabledCapabilityCount: number;
  synthetic: true;
};

export const ASSESSMENT_HEURISTIC_DISCLAIMER =
  "These results are deterministic synthetic prioritization heuristics for architecture validation. They are not deal probabilities, credit scores, or predictions about real institutions.";

export const ASSESSMENT_DIMENSIONS_NOTE =
  "Assessment completeness describes whether required rules and gates could be evaluated for a capability run. It is separate from organization-level formal Completeness (still unknown in this demo) and from Evidence-state coverage counts shown in the domain foundation section.";

const OUTCOME_LABELS: Record<string, string> = {
  awarded: "Awarded",
  not_awarded: "Not awarded",
  not_evaluated_missing: "Not evaluated — missing evidence",
  not_evaluated_stale: "Not evaluated — stale evidence",
  not_evaluated_restricted: "Not evaluated — restricted evidence",
  blocked_by_gate: "Blocked by evidence gate",
  rule_disabled: "Rule disabled",
  invalid_input: "Invalid input",
};

const OPPORTUNITY_LABELS: Record<OpportunityContextStatus, string> = {
  unknown: "Opportunity context not established",
  new_logo: "New relationship opportunity",
  cross_sell: "Additional capability opportunity",
  existing_use: "Capability already in active use",
  renewal_or_reengagement: "Renewal or reengagement opportunity",
  excluded: "Excluded from opportunity review",
};

const FIT_STATUS_LABELS: Record<string, string> = {
  unassessed: "Unassessed",
  insufficient_evidence: "Insufficient evidence",
  invalid: "Invalid",
  superseded: "Superseded",
  assessed: "Assessed",
};

export const OBSERVED_FIT_BAND_LABELS: Record<ObservedFitBand, string> = {
  limited_observed_alignment: "Limited observed alignment",
  emerging_observed_alignment: "Emerging observed alignment",
  meaningful_observed_alignment: "Meaningful observed alignment",
  strong_observed_alignment: "Strong observed alignment",
};

export function outcomeLabelFor(outcome: string): string {
  return OUTCOME_LABELS[outcome] ?? "Not evaluated";
}

export function opportunityReasonLabelFor(status: OpportunityContextStatus): string {
  return OPPORTUNITY_LABELS[status];
}

export function fitStatusLabelFor(status: string): string {
  return FIT_STATUS_LABELS[status] ?? status;
}

export function observedFitBandLabelFor(band: ObservedFitBand): string {
  return OBSERVED_FIT_BAND_LABELS[band];
}

export function sourceExplanationForAwarded(outcome: string): string {
  if (outcome === "awarded") {
    return "Supported by validated synthetic observation";
  }
  return "No awarded points";
}

export function conditionalPortfolioScoreDisclosure(coverage: {
  assessedCapabilityCount: number;
  enabledCapabilityCount: number;
  assessedPriorityWeight: number;
  enabledPriorityWeight: number;
}): string {
  return `Conditional portfolio score · ${coverage.assessedCapabilityCount} of ${coverage.enabledCapabilityCount} capabilities assessed · ${coverage.assessedPriorityWeight} of ${coverage.enabledPriorityWeight} priority weight covered.`;
}
