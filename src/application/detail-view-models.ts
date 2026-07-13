import type {
  CompletenessStatus,
  ConfidenceLevel,
  FreshnessStatus,
  PublicationEligibility,
} from "@/domain/schemas/assessment";
import type { OpportunityContextStatus } from "@/domain/assessments/results";

export type DetailPageState =
  | "ok"
  | "not_found"
  | "unauthorized"
  | "unavailable"
  | "malformed"
  | "error";

export type OrganizationDetailHeaderView = {
  displayName: string;
  detailHref: string;
  /** Server-built /compare href with this organization preselected (opaque ref only). */
  compareHref: string;
  /** Accessible action name including organization context. */
  compareActionLabel: string;
  organizationType: string;
  lifecycleStatus: string;
  locationLabel: string;
  verticalLabel: string;
  verticalSummary: string;
  tags: readonly string[];
  warnings: readonly string[];
  synthetic: true;
};

export type OrganizationProfileFactView = {
  label: string;
  value: string;
};

export type OrganizationProfileView = {
  summary: string;
  facts: readonly OrganizationProfileFactView[];
};

export type DetailConditionalScoreView = {
  pointsAwarded: number;
  pointsPossible: number;
  bandLabel: string;
  disclosure: string;
};

export type DetailPortfolioSummaryView = {
  portfolioName: string;
  statusLabel: string;
  conditionalScore?: DetailConditionalScoreView;
  coverage: {
    enabledCapabilityCount: number;
    assessedCapabilityCount: number;
    insufficientCapabilityCount: number;
    enabledPriorityWeight: number;
    assessedPriorityWeight: number;
    conditionalOnAssessedCapabilities: true;
  };
  confidence: ConfidenceLevel;
  freshness: FreshnessStatus;
  assessmentCompleteness: CompletenessStatus;
  publicationEligibility: PublicationEligibility;
  opportunityContextStatus: OpportunityContextStatus;
  opportunityContextLabel: string;
  bestObservedCapability: string;
  methodologyVersion: string;
  assessedAt: string;
  insufficiencyExplanation?: string;
  disclaimer: string;
};

export type DetailLedgerRowView = {
  ruleTitle: string;
  factorCategoryLabel: string;
  outcomeLabel: string;
  pointsAwarded: number;
  maximumPoints: number;
  reason: string;
  requirementLabel: string;
  ruleVersion: string;
  publicationEligibility: PublicationEligibility;
  freshnessSummary: string;
  epistemicSummary: string;
  lineage: readonly string[];
};

export type DetailCapabilitySectionView = {
  anchorId: string;
  capabilityName: string;
  description: string;
  categoryLabel: string;
  priority: number;
  statusLabel: string;
  pointsAwarded?: number;
  pointsPossible?: number;
  bandLabel?: string;
  confidence: ConfidenceLevel;
  freshness: FreshnessStatus;
  assessmentCompleteness: CompletenessStatus;
  publicationEligibility: PublicationEligibility;
  opportunityContextStatus?: OpportunityContextStatus;
  opportunityContextLabel: string;
  requiredEvidenceGateStatus: string;
  factorContributions: readonly {
    factorCategoryLabel: string;
    awardedPoints: number;
    maximumPoints: number;
  }[];
  evidenceGapSummary: string;
  limitations: readonly string[];
  ledgerRows: readonly DetailLedgerRowView[];
};

export type DetailEvidenceCardView =
  | {
      state: "available";
      title: string;
      organizationName: string;
      organizationDetailHref: string;
      evidenceTypeLabel: string;
      epistemicStatusLabel: string;
      freshness: FreshnessStatus;
      confidence: ConfidenceLevel;
      publicationEligibility: PublicationEligibility;
      observedAtLabel: string;
      effectivePeriodLabel: string;
      summary: string;
      observationLabel: string | null;
      provenanceSourceName: string | null;
      calculatedInputDescription: string | null;
      ruleBasedMethodologyLabel: string | null;
      supportedRuleTitles: readonly string[];
      affectedCapabilities: readonly string[];
      synthetic: true;
    }
  | {
      state: "restricted";
      title: "Restricted evidence";
      organizationName: string;
      organizationDetailHref: string;
      evidenceTypeLabel: string;
      freshness: FreshnessStatus;
      confidence: ConfidenceLevel;
      publicationEligibility: "restricted";
      synthetic: true;
    };

export type DetailEvidenceSectionView =
  | {
      state: "available";
      cards: readonly DetailEvidenceCardView[];
      total: number;
      restrictedCount: number;
    }
  | {
      state: "restricted";
      cards: readonly [];
      total: 0;
      restrictedCount: 0;
      message: string;
    };

export type DetailProvenanceCardView = {
  sourceName: string;
  sourceTypeLabel: string;
  validationStatus: string;
  licenseStatus: string;
  accessClassification: string;
  retrievedAtLabel: string;
  publishedAtLabel: string;
  reportingPeriodLabel: string;
  checksumIndicator: string;
  notes: string;
  synthetic: true;
};

export type DetailLineageSectionView = {
  rows: readonly {
    capabilityName: string;
    awardedRuleCount: number;
    awardedPoints: number;
    explanation: string;
  }[];
};

export type DetailSignalRowView = {
  title: string;
  observedAtLabel: string;
  effectivePeriodLabel: string;
  freshness: FreshnessStatus;
  epistemicStatusLabel: string;
  publicationEligibility: PublicationEligibility;
  affectedCapabilities: readonly string[];
  relevanceExplanation: string;
  provenanceSummary: string;
  synthetic: true;
};

export type DetailSignalsSectionView = {
  rows: readonly DetailSignalRowView[];
  unknownDateRows: readonly DetailSignalRowView[];
  total: number;
  maxRows: 12;
};

export type DetailGapsSectionView = {
  rows: readonly {
    capabilityName: string;
    reasonKind: string;
    reasonSummary: string;
    actionLabel: string;
    unresolvedPriorityWeight: number;
  }[];
};

export type DetailOverlayView =
  | {
      state: "available";
      relationshipStatusLabel: string;
      matchStatusLabel: string;
      reviewStatusLabel: string;
      sourceClassificationLabel: string;
      effectiveAtLabel: string;
      updatedAtLabel: string;
      capabilityUsage: readonly {
        capabilityName: string;
        usageStatusLabel: string;
      }[];
    }
  | {
      state: "restricted";
      message: string;
    }
  | {
      state: "omitted";
      message: string;
    };

export type DetailFingerprintView = {
  value: string;
  algorithm: "sha256";
  label: string;
};

export type DetailManifestView = {
  verticalLabel: string;
  engineVersion: string;
  domainSchemaVersion: string;
  adapterVersion: string;
  methodologyVersion: string;
  capabilityCatalogVersion: string;
  portfolioVersion: string;
  datasetVersion: string;
  assessedAt: string;
  determinismVerified: true;
  superseded: boolean;
  syntheticNotice: string;
  heuristicDisclaimer: string;
};

export type OrganizationDetailPageView =
  | {
      state: "ok";
      header: OrganizationDetailHeaderView;
      profile: OrganizationProfileView;
      portfolioSummary: DetailPortfolioSummaryView;
      capabilities: readonly DetailCapabilitySectionView[];
      evidence: DetailEvidenceSectionView;
      provenance: {
        cards: readonly DetailProvenanceCardView[];
        total: number;
      };
      lineage: DetailLineageSectionView;
      signals: DetailSignalsSectionView;
      gaps: DetailGapsSectionView;
      overlay: DetailOverlayView;
      fingerprint: DetailFingerprintView;
      manifest: DetailManifestView;
    }
  | {
      state: Exclude<DetailPageState, "ok">;
      stateMessage: string;
      manifest: DetailManifestView;
    };
