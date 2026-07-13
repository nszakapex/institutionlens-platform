import type {
  CompletenessStatus,
  ConfidenceLevel,
  FreshnessStatus,
  ObservedFitBand,
  PublicationEligibility,
} from "@/domain/schemas/assessment";
import type { OpportunityContextStatus } from "@/domain/assessments/results";
import type { AttentionReasonCode, AttentionSeverityClass } from "@/application/attention-policy";

export type UniverseSummaryView = {
  totalOrganizations: number;
  portfolioAssessed: number;
  portfolioInsufficientEvidence: number;
  capabilityAssessments: number;
  capabilityAssessed: number;
  capabilityInsufficientEvidence: number;
  synthetic: true;
};

export type ObservedAlignmentBucketView = {
  band: ObservedFitBand;
  bandLabel: string;
  count: number;
};

export type ObservedAlignmentDistributionView = {
  assessedBuckets: readonly ObservedAlignmentBucketView[];
  insufficientEvidenceCount: number;
  assessedTotal: number;
  synthetic: true;
};

export type ShortlistRowView = {
  displayName: string;
  detailHref: string;
  /** Server-built /compare href with this organization preselected (opaque ref only). */
  compareHref: string;
  /** Accessible action name including organization context. */
  compareActionLabel: string;
  organizationType: string;
  conditionalScore: {
    pointsAwarded: number;
    pointsPossible: number;
    disclosure: string;
  };
  bandLabel: string;
  assessedCapabilityCount: number;
  enabledCapabilityCount: number;
  assessedPriorityWeight: number;
  enabledPriorityWeight: number;
  confidence: ConfidenceLevel;
  freshness: FreshnessStatus;
  assessmentCompleteness: CompletenessStatus;
  publicationEligibility: PublicationEligibility;
  opportunityContextStatus: OpportunityContextStatus;
  opportunityContextLabel: string;
  warnings: readonly string[];
  synthetic: true;
};

export type EvidenceReviewRowView = {
  displayName: string;
  detailHref: string;
  organizationType: string;
  unresolvedPriorityWeight: number;
  insufficientCapabilityCount: number;
  reasonCodes: readonly string[];
  reasonSummary: string;
  synthetic: true;
};

export type AttentionItemView = {
  organizationLabel: string;
  detailHref: string;
  category: string;
  reasonCode: AttentionReasonCode;
  humanReason: string;
  severity: AttentionSeverityClass;
  capabilityLabel?: string;
  freshness: FreshnessStatus | "unknown";
  actionLabel: string;
  synthetic: true;
};

export type CapabilityOpportunityRowView = {
  capabilityName: string;
  priority: number;
  assessedCount: number;
  insufficientCount: number;
  bandDistribution: readonly ObservedAlignmentBucketView[];
  opportunityContexts: Readonly<Record<OpportunityContextStatus, number>>;
  freshnessWarnings: readonly string[];
  synthetic: true;
};

export type ChangeSignalRowView = {
  organizationName: string;
  changeLabel: string;
  effectivePeriodLabel: string;
  freshness: FreshnessStatus;
  epistemicLabel: string;
  publicationState: PublicationEligibility;
  synthetic: true;
};

export type OverviewPageView = {
  verticalLabel: string;
  syntheticNotice: string;
  heuristicDisclaimer: string;
  methodologyVersion: string;
  datasetVersion: string;
  asAssessedAt: string;
  universe: UniverseSummaryView;
  alignmentDistribution: ObservedAlignmentDistributionView;
  shortlist: {
    rows: readonly ShortlistRowView[];
    totalEligible: number;
    orderingExplanation: string;
    maxRows: number;
  };
  evidenceReview: {
    rows: readonly EvidenceReviewRowView[];
    total: number;
    maxRows: number;
    explanation: string;
  };
  attention: {
    items: readonly AttentionItemView[];
    total: number;
    maxRows: number;
    policyVersion: string;
    explanation: string;
  };
  capabilityOpportunities: readonly CapabilityOpportunityRowView[];
  changeSignals: {
    rows: readonly ChangeSignalRowView[];
    total: number;
    maxRows: number;
    explanation: string;
  };
  state: "ready" | "empty_tenant" | "unavailable" | "unauthorized" | "error";
  stateMessage?: string;
};
