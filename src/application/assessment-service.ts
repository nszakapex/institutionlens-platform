import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { assertPermission } from "@/authorization/context";
import {
  ASSESSMENT_DIMENSIONS_NOTE,
  ASSESSMENT_HEURISTIC_DISCLAIMER,
  conditionalPortfolioScoreDisclosure,
  fitStatusLabelFor,
  observedFitBandLabelFor,
  opportunityReasonLabelFor,
  outcomeLabelFor,
  sourceExplanationForAwarded,
  type AssessmentFoundationView,
  type CapabilityAssessmentSummaryView,
  type LedgerPreviewRow,
  type PortfolioAssessmentSummaryView,
} from "@/application/assessment-view-models";
import { ENGINE_VERSION } from "@/domain/assessments/quality";
import type { CapabilityAssessment, PortfolioAssessment } from "@/domain/assessments/results";
import {
  loadFinancialInstitutionsStore,
  type SyntheticStore,
} from "@/repositories/synthetic-organization-repository";
import { SyntheticAssessmentRepository } from "@/repositories/synthetic-assessment-repository";
import { FINANCIAL_INSTITUTION_CAPABILITIES } from "@/verticals/financial-institutions/capabilities";
import { DATASET_DECLARATION } from "@/verticals/financial-institutions/schema";
import { METHODOLOGY_VERSION } from "@/verticals/financial-institutions/assessment/methodology";
import { FINANCIAL_INSTITUTION_RULE_SETS } from "@/verticals/financial-institutions/assessment/rules";
import { SYNTHETIC_FI_PORTFOLIO } from "@/verticals/financial-institutions/assessment/synthetic-portfolio";

const METHODOLOGY_LABEL = "Synthetic financial-institutions prioritization methodology";
const LEDGER_PREVIEW_LIMIT = 5;
const SAMPLE_LIMIT = 3;
const LIST_PAGE_SIZE = 50;

const RULE_TITLE_BY_ID = new Map(
  FINANCIAL_INSTITUTION_RULE_SETS.flatMap((ruleSet) =>
    ruleSet.rules.map((rule) => [rule.ruleId, rule.title] as const),
  ),
);

function capabilityNameById(capabilityId: string): string {
  return (
    FINANCIAL_INSTITUTION_CAPABILITIES.find((item) => item.id === capabilityId)?.name ??
    "Synthetic capability"
  );
}

function orgDisplayNameById(store: SyntheticStore, organizationId: string): string {
  return (
    store.organizations.find((item) => item.id === organizationId)?.displayName ??
    "Synthetic organization"
  );
}

function toLedgerPreviewRows(assessment: CapabilityAssessment): readonly LedgerPreviewRow[] {
  return Object.freeze(
    assessment.ledger.slice(0, LEDGER_PREVIEW_LIMIT).map((entry) => ({
      title: RULE_TITLE_BY_ID.get(entry.ruleId) ?? humanizeFactorCategory(entry.factorCategory),
      outcomeLabel: outcomeLabelFor(entry.outcome),
      pointsAwarded: entry.pointsAwarded,
      maximumPoints: entry.maximumPoints,
      reason: entry.reason,
      sourceExplanation: sourceExplanationForAwarded(entry.outcome),
    })),
  );
}

function humanizeFactorCategory(category: string): string {
  return category
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toSummaryView(
  assessment: CapabilityAssessment,
  store: SyntheticStore,
  opportunityStatus: CapabilityAssessmentSummaryView["opportunityContextStatus"],
): CapabilityAssessmentSummaryView {
  const fit = assessment.fit;
  const status = opportunityStatus ?? "unknown";
  return {
    orgDisplayName: orgDisplayNameById(store, assessment.organizationId),
    capabilityName: capabilityNameById(assessment.capabilityId),
    fitStatus: fitStatusLabelFor(fit.status),
    ...(fit.status === "assessed"
      ? {
          pointsAwarded: fit.pointsAwarded,
          pointsPossible: fit.pointsPossible,
          band: fit.band,
          bandLabel: observedFitBandLabelFor(fit.band),
        }
      : {}),
    confidence: assessment.confidence,
    freshness: assessment.freshness,
    assessmentCompleteness: assessment.completeness,
    publicationEligibility: assessment.publicationEligibility,
    opportunityContextStatus: status,
    opportunityReasonLabel: opportunityReasonLabelFor(status),
    ledgerPreview: toLedgerPreviewRows(assessment),
  };
}

function toPortfolioSummaryView(
  assessment: PortfolioAssessment,
  store: SyntheticStore,
): PortfolioAssessmentSummaryView {
  const coverage = {
    enabledCapabilityCount: assessment.coverage.enabledCapabilityCount,
    assessedCapabilityCount: assessment.coverage.assessedCapabilityCount,
    insufficientCapabilityCount: assessment.coverage.insufficientCapabilityCount,
    enabledPriorityWeight: assessment.coverage.enabledPriorityWeight,
    assessedPriorityWeight: assessment.coverage.assessedPriorityWeight,
    conditionalOnAssessedCapabilities: true as const,
    conditionalScoreDisclosure: conditionalPortfolioScoreDisclosure(assessment.coverage),
  };

  return {
    orgDisplayName: orgDisplayNameById(store, assessment.organizationId),
    portfolioName: SYNTHETIC_FI_PORTFOLIO.name,
    statusLabel: fitStatusLabelFor(assessment.status),
    ...(assessment.status === "assessed" && assessment.portfolioPriorityScore
      ? {
          pointsAwarded: assessment.portfolioPriorityScore.pointsAwarded,
          pointsPossible: assessment.portfolioPriorityScore.pointsPossible,
          bandLabel: observedFitBandLabelFor(assessment.portfolioPriorityScore.band),
        }
      : {}),
    coverage,
    confidence: assessment.confidence,
    freshness: assessment.freshness,
    assessmentCompleteness: assessment.completeness,
    publicationEligibility: assessment.publicationEligibility,
  };
}

async function listAllCapabilityAssessments(
  context: AuthorizationContext,
  repository: SyntheticAssessmentRepository,
): Promise<CapabilityAssessment[]> {
  const items: CapabilityAssessment[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (items.length < total) {
    const result = await repository.listCapabilityAssessments(context, {
      page,
      pageSize: LIST_PAGE_SIZE,
    });
    total = result.total;
    items.push(...result.items);
    if (result.items.length === 0) break;
    page += 1;
  }

  return items;
}

async function listAllPortfolioAssessments(
  context: AuthorizationContext,
  repository: SyntheticAssessmentRepository,
): Promise<PortfolioAssessment[]> {
  const items: PortfolioAssessment[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (items.length < total) {
    const result = await repository.listPortfolioAssessments(context, {
      page,
      pageSize: LIST_PAGE_SIZE,
    });
    total = result.total;
    items.push(...result.items);
    if (result.items.length === 0) break;
    page += 1;
  }

  return items;
}

/**
 * Builds the Phase 4 assessment foundation preview from the synthetic assessment repository.
 */
export async function buildAssessmentFoundationView(
  context: AuthorizationContext,
  store: SyntheticStore = loadFinancialInstitutionsStore(),
  repository: SyntheticAssessmentRepository = new SyntheticAssessmentRepository(),
): Promise<AssessmentFoundationView> {
  assertPermission(context, "assessment:read");
  assertPermission(context, "organization:read");

  const allAssessments = await listAllCapabilityAssessments(context, repository);
  const allPortfolios = await listAllPortfolioAssessments(context, repository);

  const samples: CapabilityAssessmentSummaryView[] = [];
  for (const assessment of allAssessments.slice(0, SAMPLE_LIMIT)) {
    const portfolio = allPortfolios.find(
      (item) => item.organizationId === assessment.organizationId,
    );
    const opportunity = portfolio?.opportunityContexts.find(
      (item) => item.capabilityId === assessment.capabilityId,
    );
    samples.push(toSummaryView(assessment, store, opportunity?.status));
  }

  const portfolioSamples = allPortfolios
    .filter((item) => item.status === "assessed" && item.portfolioPriorityScore)
    .slice(0, SAMPLE_LIMIT)
    .map((item) => toPortfolioSummaryView(item, store));

  let assessedCapabilityCount = 0;
  let insufficientEvidenceCount = 0;
  for (const assessment of allAssessments) {
    if (assessment.fit.status === "assessed") assessedCapabilityCount += 1;
    if (assessment.fit.status === "insufficient_evidence") insufficientEvidenceCount += 1;
  }

  const organizations = store.organizations.filter((org) => org.tenantId === context.tenant.id);

  return {
    engineVersion: ENGINE_VERSION,
    methodologyLabel: METHODOLOGY_LABEL,
    methodologyVersion: METHODOLOGY_VERSION,
    organizationCount: organizations.length,
    assessedCapabilityCount,
    insufficientEvidenceCount,
    sampleAssessments: Object.freeze(samples),
    samplePortfolioAssessments: Object.freeze(portfolioSamples),
    heuristicDisclaimer: ASSESSMENT_HEURISTIC_DISCLAIMER,
    syntheticDeclaration: DATASET_DECLARATION,
    dimensionsNote: ASSESSMENT_DIMENSIONS_NOTE,
  };
}
