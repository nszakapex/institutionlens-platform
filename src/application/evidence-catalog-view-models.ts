import type {
  ConfidenceLevel,
  FreshnessStatus,
  PublicationEligibility,
} from "@/domain/schemas/assessment";
import type { EvidenceCatalogView } from "@/application/evidence-catalog-query";

export type EvidenceCatalogRowView =
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
      summary: string;
      provenanceSourceName: string | null;
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

export type ProvenanceCatalogRowView = {
  state: "available";
  sourceName: string;
  sourceTypeLabel: string;
  validationStatus: string;
  licenseStatus: string;
  accessClassification: string;
  retrievedAtLabel: string;
  publishedAtLabel: string;
  reportingPeriodLabel: string;
  synthetic: true;
};

export type EvidenceCatalogPageView = {
  state: "ready" | "malformed_query" | "unauthorized" | "unavailable" | "error";
  stateMessage?: string;
  verticalLabel: string;
  syntheticNotice: string;
  heuristicDisclaimer: string;
  queryValid: boolean;
  errorSummary?: string;
  unknownParams: readonly string[];
  view: EvidenceCatalogView;
  formValues: {
    text: string;
    evidenceType: readonly string[];
    epistemicStatus: readonly string[];
    freshness: readonly string[];
    confidence: readonly string[];
    publicationEligibility: readonly string[];
    capability: readonly string[];
    ruleOutcome: readonly string[];
    periodCategory: readonly string[];
    sourceType: readonly string[];
    validationStatus: readonly string[];
    licenseStatus: readonly string[];
    accessClassification: readonly string[];
    reportingPeriod: readonly string[];
    syntheticStatus: readonly string[];
    orgRef: string;
    pageSize: number;
  };
  activeFilters: readonly {
    label: string;
    removeHref: string;
  }[];
  clearAllHref: "/evidence";
  rows: readonly (EvidenceCatalogRowView | ProvenanceCatalogRowView)[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  pagination: {
    previousHref: string | null;
    nextHref: string | null;
    pageHrefs: readonly { page: number; href: string; current: boolean }[];
    beyondRange: boolean;
    recoveryHref: string | null;
  };
};
