import type {
  CompletenessStatus,
  ConfidenceLevel,
  FreshnessStatus,
  PublicationEligibility,
} from "@/domain/schemas/assessment";
import type { OpportunityContextStatus } from "@/domain/assessments/results";
import type { ExplorerSort } from "@/application/explorer-query";

export type ExplorerResultRowView = {
  displayName: string;
  detailHref: string;
  organizationType: string;
  verticalSummary: string;
  portfolioAssessmentStatus: string;
  conditionalScore?: {
    pointsAwarded: number;
    pointsPossible: number;
    disclosure: string;
  };
  bandLabel?: string;
  assessedCapabilityCount: number | null;
  enabledCapabilityCount: number | null;
  assessedPriorityWeight: number | null;
  enabledPriorityWeight: number | null;
  confidence: ConfidenceLevel | "unavailable";
  freshness: FreshnessStatus | "unavailable";
  assessmentCompleteness: CompletenessStatus | "unavailable";
  publicationEligibility: PublicationEligibility | "unavailable";
  opportunityContextStatus: OpportunityContextStatus;
  opportunityContextLabel: string;
  warnings: readonly string[];
  synthetic: true;
};

export type ActiveFilterChipView = {
  key: string;
  label: string;
  /** Relative query string that removes this filter while preserving others. */
  removeHref: string;
};

export type ExplorerFacetOption = {
  value: string;
  label: string;
};

export type ExplorerFacetsView = {
  organizationTypes: readonly ExplorerFacetOption[];
  lifecycleStatuses: readonly ExplorerFacetOption[];
  tags: readonly ExplorerFacetOption[];
  assessmentStatuses: readonly ExplorerFacetOption[];
  observedAlignmentBands: readonly ExplorerFacetOption[];
  confidenceLevels: readonly ExplorerFacetOption[];
  freshnessStatuses: readonly ExplorerFacetOption[];
  assessmentCompleteness: readonly ExplorerFacetOption[];
  publicationEligibility: readonly ExplorerFacetOption[];
  opportunityContexts: readonly ExplorerFacetOption[];
  capabilities: readonly ExplorerFacetOption[];
  verticalFilters: Readonly<
    Record<
      string,
      {
        label: string;
        options: readonly ExplorerFacetOption[];
      }
    >
  >;
};

export type ExplorerPageView = {
  verticalLabel: string;
  syntheticNotice: string;
  heuristicDisclaimer: string;
  queryValid: boolean;
  errorSummary?: string;
  unknownParams: readonly string[];
  /** Applied query values for form defaults — no internal IDs. */
  formValues: {
    text: string;
    organizationType: readonly string[];
    assessmentStatus: readonly string[];
    observedAlignmentBand: readonly string[];
    confidence: readonly string[];
    freshness: readonly string[];
    assessmentCompleteness: readonly string[];
    publicationEligibility: readonly string[];
    opportunityContext: readonly string[];
    capabilityId: readonly string[];
    capabilityAssessmentStatus: readonly string[];
    institutionKind: readonly string[];
    scaleBand: readonly string[];
    operatingRegion: readonly string[];
    dataAvailability: readonly string[];
    serviceAreaType: readonly string[];
    ownershipModel: readonly string[];
    operatingComplexityBand: readonly string[];
    digitalServiceMaturity: readonly string[];
    lendingBreadth: readonly string[];
    exclusionPolicy: string;
    sort: ExplorerSort;
    pageSize: number;
  };
  activeFilters: readonly ActiveFilterChipView[];
  clearAllHref: string;
  sort: ExplorerSort;
  sortLabel: string;
  sortExplanation: string;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  resultCountAnnouncement: string;
  assessedSection: readonly ExplorerResultRowView[];
  insufficientSection: readonly ExplorerResultRowView[];
  /** When sort is not score-based, a single combined list (still never fabricates scores). */
  combinedRows: readonly ExplorerResultRowView[];
  useAssessedInsufficientSplit: boolean;
  pagination: {
    previousHref: string | null;
    nextHref: string | null;
    pageHrefs: readonly { page: number; href: string; current: boolean }[];
    beyondRange: boolean;
    recoveryHref: string | null;
  };
  facets: ExplorerFacetsView;
  state:
    | "ready"
    | "empty_tenant"
    | "no_results"
    | "no_search_results"
    | "malformed_query"
    | "unavailable"
    | "unauthorized"
    | "error"
    | "beyond_range";
  stateMessage?: string;
};
