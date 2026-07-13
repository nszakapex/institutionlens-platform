import type { AssessmentId, OrganizationId, TenantId } from "@/domain/ids";
import type { CapabilityPortfolio } from "@/domain/portfolios/schemas";
import type { OrganizationOverlay } from "@/domain/overlays/schemas";
import {
  PortfolioAssessmentSchema,
  type CapabilityAssessment,
  type OpportunityContext,
  type PortfolioAssessment,
  type PortfolioCapabilityContribution,
} from "@/domain/assessments/results";
import { ENGINE_VERSION, classifyFreshness } from "@/domain/assessments/quality";
import { bandFromPoints } from "@/domain/assessments/score";
import type {
  CompletenessStatus,
  ConfidenceLevel,
  FitAssessment,
  PublicationEligibility,
} from "@/domain/schemas/assessment";
import { deriveOpportunityContext } from "@/assessment/opportunity";

export type AggregatePortfolioAssessmentInput = {
  assessmentId: AssessmentId;
  tenantId: TenantId;
  organizationId: OrganizationId;
  portfolio: CapabilityPortfolio;
  capabilityAssessments: readonly CapabilityAssessment[];
  overlay: OrganizationOverlay | null;
  assessedAt: string;
  engineVersion?: string;
};

const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = {
  unknown: 0,
  low: 1,
  moderate: 2,
  high: 3,
};

const COMPLETENESS_RANK: Record<CompletenessStatus, number> = {
  insufficient: 0,
  unknown: 1,
  partial: 2,
  sufficient: 3,
};

const PUBLICATION_RANK: Record<PublicationEligibility, number> = {
  restricted: 0,
  review_required: 1,
  internal_only: 2,
  eligible: 3,
};

const WEIGHT_SCALE = 100_000_000;

function parseUnitIntervalToScaled(value: string): number {
  const [whole, frac = ""] = value.split(".");
  const padded = (frac + "00000000").slice(0, 8);
  return Number(whole) * WEIGHT_SCALE + Number(padded);
}

function formatWeight(priority: number, totalPriority: number): string {
  if (totalPriority <= 0) {
    return "0.00000000";
  }
  const scaled = Math.floor((priority * WEIGHT_SCALE) / totalPriority);
  if (scaled >= WEIGHT_SCALE) {
    return "1.00000000";
  }
  const frac = String(scaled).padStart(8, "0");
  return `0.${frac}`;
}

function ratioAtLeast(numerator: number, denominator: number, threshold: string): boolean {
  if (denominator <= 0) {
    return false;
  }
  const thresholdScaled = parseUnitIntervalToScaled(threshold);
  return numerator * WEIGHT_SCALE >= thresholdScaled * denominator;
}

function ratioBelow(numerator: number, denominator: number, threshold: string): boolean {
  if (denominator <= 0) {
    return true;
  }
  const thresholdScaled = parseUnitIntervalToScaled(threshold);
  return numerator * WEIGHT_SCALE < thresholdScaled * denominator;
}

function minConfidence(levels: readonly ConfidenceLevel[]): ConfidenceLevel {
  if (levels.length === 0) {
    return "unknown";
  }
  return levels.reduce((worst, level) =>
    CONFIDENCE_RANK[level] < CONFIDENCE_RANK[worst] ? level : worst,
  );
}

function minCompleteness(levels: readonly CompletenessStatus[]): CompletenessStatus {
  if (levels.length === 0) {
    return "unknown";
  }
  return levels.reduce((worst, level) =>
    COMPLETENESS_RANK[level] < COMPLETENESS_RANK[worst] ? level : worst,
  );
}

function minPublication(levels: readonly PublicationEligibility[]): PublicationEligibility {
  if (levels.length === 0) {
    return "internal_only";
  }
  return levels.reduce((worst, level) =>
    PUBLICATION_RANK[level] < PUBLICATION_RANK[worst] ? level : worst,
  );
}

function assessedPoints(fit: FitAssessment): number | null {
  if (fit.status !== "assessed") {
    return null;
  }
  return fit.pointsAwarded;
}

/**
 * Priority-weighted portfolio aggregation.
 * Overlay-derived opportunity context is attached without altering fit scores.
 */
export function aggregatePortfolioAssessment(
  input: AggregatePortfolioAssessmentInput,
): PortfolioAssessment {
  const engineVersion = input.engineVersion ?? ENGINE_VERSION;
  const portfolio = input.portfolio;
  const enabled = portfolio.capabilities
    .filter((capability) => capability.status === "enabled")
    .sort((a, b) => a.capabilityId.localeCompare(b.capabilityId));

  const assessmentByCapability = new Map(
    input.capabilityAssessments.map((assessment) => [assessment.capabilityId, assessment]),
  );

  const totalPriority = enabled.reduce((sum, capability) => sum + capability.priority, 0);

  const contributions: PortfolioCapabilityContribution[] = [];
  const opportunityContexts: OpportunityContext[] = [];
  const includedAssessments: CapabilityAssessment[] = [];

  let insufficientOrInvalid = 0;
  let assessedCount = 0;

  for (const capability of enabled) {
    const assessment = assessmentByCapability.get(capability.capabilityId);
    opportunityContexts.push(deriveOpportunityContext(input.overlay, capability.capabilityId));

    if (!assessment) {
      insufficientOrInvalid += 1;
      contributions.push({
        capabilityId: capability.capabilityId,
        fit: { status: "unassessed" },
        priority: capability.priority,
        weight: formatWeight(capability.priority, totalPriority),
        includedInAggregate: false,
      });
      continue;
    }

    const fit = assessment.fit;
    if (fit.status === "insufficient_evidence" || fit.status === "invalid") {
      insufficientOrInvalid += 1;
    }
    if (fit.status === "assessed") {
      assessedCount += 1;
      includedAssessments.push(assessment);
    }

    contributions.push({
      capabilityId: capability.capabilityId,
      fit,
      priority: capability.priority,
      weight: formatWeight(capability.priority, totalPriority),
      includedInAggregate: fit.status === "assessed",
    });
  }

  const policy = portfolio.aggregationPolicy;
  const enabledCount = enabled.length;

  let status: PortfolioAssessment["status"] = "assessed";
  let portfolioPriorityScore: PortfolioAssessment["portfolioPriorityScore"] = null;

  if (ratioAtLeast(insufficientOrInvalid, enabledCount, policy.insufficientPortfolioRatio)) {
    status = "insufficient_evidence";
  } else if (ratioBelow(assessedCount, enabledCount, policy.minAssessedCapabilityRatio)) {
    status = "insufficient_evidence";
  } else if (includedAssessments.length === 0) {
    status = "insufficient_evidence";
  } else {
    let totalAwardedWeighted = 0;
    let totalPossibleWeighted = 0;

    for (const capability of enabled) {
      const assessment = assessmentByCapability.get(capability.capabilityId);
      if (!assessment || assessment.fit.status !== "assessed") {
        continue;
      }
      totalAwardedWeighted += capability.priority * assessment.fit.pointsAwarded;
      totalPossibleWeighted += capability.priority * assessment.fit.pointsPossible;
    }

    if (totalPossibleWeighted <= 0) {
      status = "insufficient_evidence";
    } else {
      const score = Math.floor((totalAwardedWeighted * 100) / totalPossibleWeighted);
      portfolioPriorityScore = {
        pointsAwarded: score,
        pointsPossible: 100,
        band: bandFromPoints(score, 100),
      };
      status = "assessed";
    }
  }

  // Mark includedInAggregate false when portfolio itself is insufficient
  if (status !== "assessed") {
    for (const contribution of contributions) {
      contribution.includedInAggregate = false;
    }
    portfolioPriorityScore = null;
  }

  let bestObservedCapabilityFit: PortfolioAssessment["bestObservedCapabilityFit"] = null;
  for (const assessment of includedAssessments) {
    if (assessment.fit.status !== "assessed") continue;
    const points = assessedPoints(assessment.fit);
    if (points === null) continue;
    if (
      !bestObservedCapabilityFit ||
      (bestObservedCapabilityFit.fit.status === "assessed" &&
        points > bestObservedCapabilityFit.fit.pointsAwarded)
    ) {
      bestObservedCapabilityFit = {
        capabilityId: assessment.capabilityId,
        fit: assessment.fit,
      };
    }
  }
  if (status !== "assessed") {
    bestObservedCapabilityFit = null;
  }

  const sourceAssessments = enabled
    .map((capability) => assessmentByCapability.get(capability.capabilityId))
    .filter((assessment): assessment is CapabilityAssessment => assessment !== undefined);

  const freshness = classifyFreshness(sourceAssessments.map((assessment) => assessment.freshness));

  let assessedPriorityWeight = 0;
  let assessedCapabilityCountForCoverage = 0;
  let insufficientCapabilityCount = 0;
  for (const contribution of contributions) {
    if (contribution.fit.status === "assessed") {
      assessedCapabilityCountForCoverage += 1;
      assessedPriorityWeight += contribution.priority;
    }
    if (
      contribution.fit.status === "insufficient_evidence" ||
      contribution.fit.status === "invalid" ||
      contribution.fit.status === "unassessed"
    ) {
      insufficientCapabilityCount += 1;
    }
  }

  return PortfolioAssessmentSchema.parse({
    id: input.assessmentId,
    tenantId: input.tenantId,
    organizationId: input.organizationId,
    portfolioId: portfolio.id,
    verticalId: portfolio.verticalId,
    schemaVersion: "1.0.0",
    status,
    portfolioPriorityScore,
    bestObservedCapabilityFit,
    capabilityAssessmentIds: sourceAssessments.map((assessment) => assessment.id).sort(),
    contributions,
    coverage: {
      enabledCapabilityCount: enabledCount,
      assessedCapabilityCount: assessedCapabilityCountForCoverage,
      insufficientCapabilityCount,
      enabledPriorityWeight: totalPriority,
      assessedPriorityWeight,
      conditionalOnAssessedCapabilities: true,
    },
    confidence: minConfidence(sourceAssessments.map((assessment) => assessment.confidence)),
    freshness,
    completeness: minCompleteness(sourceAssessments.map((assessment) => assessment.completeness)),
    publicationEligibility: minPublication(
      sourceAssessments.map((assessment) => assessment.publicationEligibility),
    ),
    opportunityContexts,
    assessedAt: input.assessedAt,
    engineVersion,
    aggregationPolicyVersion: "1.0.0",
    synthetic: true,
  });
}
