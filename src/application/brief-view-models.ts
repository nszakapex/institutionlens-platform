import type { OrganizationPublicRef } from "@/domain/organization-public-ref";
import type { BriefPublicRef } from "@/domain/brief-public-ref";

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

export type BriefManifestView = {
  methodologyVersion: string;
  datasetVersion: string;
  asAssessedAt: string;
  syntheticNotice: string;
  permittedUse: string;
  nonRecommendationDisclaimer: string;
};

/** Directory row — opaque refs and redacted labels only (Batch 1 shell). */
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

/**
 * Individual brief shell (Batch 1). Full sections arrive in Batch 2/3.
 * When state is not a content-bearing projection, section fields stay empty.
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
  /** Placeholder for Batch 2 projections — always empty in Batch 1. */
  sectionPlaceholders: readonly string[];
  manifest: BriefManifestView;
};
