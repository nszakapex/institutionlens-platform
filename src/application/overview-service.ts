import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { AuthorizationError } from "@/domain/errors";
import type { ObservedFitBand } from "@/domain/schemas/assessment";
import { ObservedFitBandSchema } from "@/domain/schemas/assessment";
import type { OpportunityContextStatus } from "@/domain/assessments/results";
import { ASSESSMENT_HEURISTIC_DISCLAIMER } from "@/application/assessment-view-models";
import {
  ATTENTION_POLICY_MANIFEST,
  ATTENTION_POLICY_VERSION,
  attentionDefinitionFor,
  type AttentionReasonCode,
} from "@/application/attention-policy";
import {
  PRIORITIZATION_POLICY_MANIFEST,
  compareDisplayName,
  compareStableId,
  confidenceRank,
  freshnessRank,
} from "@/application/prioritization-policy";
import type {
  AttentionItemView,
  CapabilityOpportunityRowView,
  ChangeSignalRowView,
  EvidenceReviewRowView,
  ObservedAlignmentBucketView,
  OverviewPageView,
  ShortlistRowView,
} from "@/application/overview-view-models";
import { compareHrefFor } from "@/application/compare-query";
import { inboundBriefActionFor } from "@/application/inbound-brief-action";
import {
  bandLabel,
  capabilityNameById,
  conditionalDisclosure,
  getTenantResearchReadModel,
  insufficientReasonCodes,
  isCompatibleAdapter,
  reasonSummaryFromCodes,
  scoreCoverageRatio,
  type OrgResearchRecord,
  type TenantResearchReadModel,
} from "@/application/research-read-model";

const ALL_BANDS = ObservedFitBandSchema.options;

function emptyBandDistribution(): ObservedAlignmentBucketView[] {
  return ALL_BANDS.map((band) => ({
    band,
    bandLabel: bandLabel(band),
    count: 0,
  }));
}

function buildUniverse(model: TenantResearchReadModel) {
  let portfolioAssessed = 0;
  let portfolioInsufficient = 0;
  let capabilityAssessed = 0;
  let capabilityInsufficient = 0;
  let capabilityTotal = 0;

  for (const org of model.organizations) {
    if (org.portfolio.status === "assessed") portfolioAssessed += 1;
    if (org.portfolio.status === "insufficient_evidence") portfolioInsufficient += 1;
    for (const cap of org.capabilityAssessments) {
      capabilityTotal += 1;
      if (cap.fit.status === "assessed") capabilityAssessed += 1;
      if (cap.fit.status === "insufficient_evidence") capabilityInsufficient += 1;
    }
  }

  return {
    totalOrganizations: model.organizations.length,
    portfolioAssessed,
    portfolioInsufficientEvidence: portfolioInsufficient,
    capabilityAssessments: capabilityTotal,
    capabilityAssessed,
    capabilityInsufficientEvidence: capabilityInsufficient,
    synthetic: true as const,
  };
}

function buildAlignmentDistribution(model: TenantResearchReadModel) {
  const buckets = emptyBandDistribution();
  const byBand = new Map(buckets.map((b) => [b.band, b]));
  let insufficientEvidenceCount = 0;
  let assessedTotal = 0;

  for (const org of model.organizations) {
    if (org.portfolio.status === "insufficient_evidence") {
      insufficientEvidenceCount += 1;
      continue;
    }
    if (org.portfolio.status !== "assessed" || !org.portfolio.portfolioPriorityScore) continue;
    assessedTotal += 1;
    const bucket = byBand.get(org.portfolio.portfolioPriorityScore.band);
    if (bucket) bucket.count += 1;
  }

  return {
    assessedBuckets: Object.freeze(buckets),
    insufficientEvidenceCount,
    assessedTotal,
    synthetic: true as const,
  };
}

function shortlistWarnings(org: OrgResearchRecord): string[] {
  const warnings: string[] = [];
  const score = org.portfolio.portfolioPriorityScore;
  if (
    score &&
    (score.band === "strong_observed_alignment" ||
      score.band === "meaningful_observed_alignment") &&
    org.portfolio.confidence === "low"
  ) {
    warnings.push("High observed alignment with low confidence — review before use.");
  }
  if (org.portfolio.freshness === "stale") {
    warnings.push("Assessment supporting evidence is stale.");
  }
  if (org.portfolio.confidence === "low") {
    warnings.push("Low confidence assessment.");
  }
  return warnings;
}

function compareShortlist(a: OrgResearchRecord, b: OrgResearchRecord): number {
  const scoreA = a.portfolio.portfolioPriorityScore!;
  const scoreB = b.portfolio.portfolioPriorityScore!;
  const ratioA = scoreA.pointsPossible > 0 ? scoreA.pointsAwarded / scoreA.pointsPossible : 0;
  const ratioB = scoreB.pointsPossible > 0 ? scoreB.pointsAwarded / scoreB.pointsPossible : 0;
  if (ratioA !== ratioB) return ratioB - ratioA;
  const cov = scoreCoverageRatio(b) - scoreCoverageRatio(a);
  if (cov !== 0) return cov;
  const conf = confidenceRank(a.portfolio.confidence) - confidenceRank(b.portfolio.confidence);
  if (conf !== 0) return conf;
  const fresh = freshnessRank(a.portfolio.freshness) - freshnessRank(b.portfolio.freshness);
  if (fresh !== 0) return fresh;
  const name = compareDisplayName(a.displayName, b.displayName);
  if (name !== 0) return name;
  return compareStableId(a.organizationId, b.organizationId);
}

function buildShortlist(model: TenantResearchReadModel, context: AuthorizationContext) {
  const eligible = model.organizations.filter(
    (org) =>
      isCompatibleAdapter(org) &&
      !org.excluded &&
      org.portfolio.status === "assessed" &&
      org.portfolio.portfolioPriorityScore !== null,
  );
  const ordered = [...eligible].sort(compareShortlist);
  const maxRows = PRIORITIZATION_POLICY_MANIFEST.shortlistMaxRows;
  const rows: ShortlistRowView[] = ordered.slice(0, maxRows).map((org) => {
    const score = org.portfolio.portfolioPriorityScore!;
    const briefAction = inboundBriefActionFor(context, org);
    return {
      displayName: org.displayName,
      detailHref: `/organizations/${org.publicRef}`,
      compareHref: compareHrefFor([org.publicRef]),
      compareActionLabel: `Add ${org.displayName} to comparison`,
      briefHref: briefAction?.briefHref ?? null,
      briefActionLabel: briefAction?.briefActionLabel ?? null,
      organizationType: org.organizationType,
      conditionalScore: {
        pointsAwarded: score.pointsAwarded,
        pointsPossible: score.pointsPossible,
        disclosure: conditionalDisclosure(org),
      },
      bandLabel: bandLabel(score.band),
      assessedCapabilityCount: org.portfolio.coverage.assessedCapabilityCount,
      enabledCapabilityCount: org.portfolio.coverage.enabledCapabilityCount,
      assessedPriorityWeight: org.portfolio.coverage.assessedPriorityWeight,
      enabledPriorityWeight: org.portfolio.coverage.enabledPriorityWeight,
      confidence: org.portfolio.confidence,
      freshness: org.portfolio.freshness,
      assessmentCompleteness: org.portfolio.completeness,
      publicationEligibility: org.portfolio.publicationEligibility,
      opportunityContextStatus: org.opportunityContextStatus,
      opportunityContextLabel: org.opportunityContextLabel,
      warnings: Object.freeze(shortlistWarnings(org)),
      synthetic: true,
    };
  });

  return {
    rows: Object.freeze(rows),
    totalEligible: eligible.length,
    maxRows,
    orderingExplanation:
      "Ordered by conditional portfolio score, then assessed priority-weight coverage, confidence, freshness, and name. Opportunity context does not affect ordering. Explicitly excluded organizations are omitted.",
  };
}

function buildEvidenceReview(model: TenantResearchReadModel) {
  const candidates = model.organizations.filter(
    (org) => org.portfolio.status === "insufficient_evidence",
  );
  const ordered = [...candidates].sort((a, b) => {
    const unresolvedA =
      a.portfolio.coverage.enabledPriorityWeight - a.portfolio.coverage.assessedPriorityWeight;
    const unresolvedB =
      b.portfolio.coverage.enabledPriorityWeight - b.portfolio.coverage.assessedPriorityWeight;
    if (unresolvedA !== unresolvedB) return unresolvedB - unresolvedA;
    const insuff =
      b.portfolio.coverage.insufficientCapabilityCount -
      a.portfolio.coverage.insufficientCapabilityCount;
    if (insuff !== 0) return insuff;
    return compareDisplayName(a.displayName, b.displayName);
  });

  const maxRows = PRIORITIZATION_POLICY_MANIFEST.evidenceReviewMaxRows;
  const rows: EvidenceReviewRowView[] = ordered.slice(0, maxRows).map((org) => {
    const codes = insufficientReasonCodes(org);
    return {
      displayName: org.displayName,
      detailHref: `/organizations/${org.publicRef}`,
      organizationType: org.organizationType,
      unresolvedPriorityWeight:
        org.portfolio.coverage.enabledPriorityWeight -
        org.portfolio.coverage.assessedPriorityWeight,
      insufficientCapabilityCount: org.portfolio.coverage.insufficientCapabilityCount,
      reasonCodes: Object.freeze(codes),
      reasonSummary: reasonSummaryFromCodes(codes),
      synthetic: true,
    };
  });

  return {
    rows: Object.freeze(rows),
    total: candidates.length,
    maxRows,
    explanation:
      "Organizations with insufficient portfolio evidence. No numeric fit score is assigned. Sorted by unresolved priority weight, insufficient capability count, then name.",
  };
}

type AttentionCandidate = {
  organizationId: string;
  organizationLabel: string;
  detailHref: string;
  reasonCode: AttentionReasonCode;
  capabilityLabel?: string;
  freshness: OrgResearchRecord["portfolio"]["freshness"] | "unknown";
};

function buildAttentionCandidates(org: OrgResearchRecord): AttentionCandidate[] {
  const items: AttentionCandidate[] = [];
  const push = (
    reasonCode: AttentionReasonCode,
    opts?: { capabilityLabel?: string; freshness?: AttentionCandidate["freshness"] },
  ) => {
    const item: AttentionCandidate = {
      organizationId: org.organizationId,
      organizationLabel: org.displayName,
      detailHref: `/organizations/${org.publicRef}`,
      reasonCode,
      freshness: opts?.freshness ?? org.portfolio.freshness,
    };
    if (opts?.capabilityLabel) item.capabilityLabel = opts.capabilityLabel;
    items.push(item);
  };

  if (org.portfolio.status === "insufficient_evidence") {
    push("insufficient_evidence");
  }
  if (org.portfolio.freshness === "stale") {
    push("stale_supporting_evidence");
  }
  if (org.portfolio.confidence === "low" && org.portfolio.status === "assessed") {
    push("low_confidence_assessment");
  }
  if (org.portfolio.publicationEligibility === "review_required") {
    push("publication_review_required");
  }
  if (org.portfolio.publicationEligibility === "restricted") {
    push("restricted_publication");
  }
  if (org.ambiguousOverlay) {
    push("ambiguous_overlay_match");
  }
  for (const ctx of org.portfolio.opportunityContexts) {
    if (ctx.status === "cross_sell") {
      push("synthetic_cross_sell_context", {
        capabilityLabel: capabilityNameById(ctx.capabilityId ?? ""),
      });
    }
  }
  for (const signal of org.changeSignals) {
    if (signal.freshness !== "stale" && signal.publicationEligibility !== "restricted") {
      push("material_change_signal", { freshness: signal.freshness });
    }
  }
  const score = org.portfolio.portfolioPriorityScore;
  if (
    org.portfolio.status === "assessed" &&
    score &&
    (score.band === "strong_observed_alignment" ||
      score.band === "meaningful_observed_alignment") &&
    org.portfolio.confidence === "low"
  ) {
    push("high_observed_alignment_low_confidence");
  }

  return items;
}

function buildAttentionQueue(model: TenantResearchReadModel) {
  const seen = new Set<string>();
  const candidates: AttentionCandidate[] = [];
  for (const org of model.organizations) {
    for (const item of buildAttentionCandidates(org)) {
      const key = `${item.organizationId}|${item.reasonCode}|${item.capabilityLabel ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(item);
    }
  }

  candidates.sort((a, b) => {
    const defA = attentionDefinitionFor(a.reasonCode);
    const defB = attentionDefinitionFor(b.reasonCode);
    if (defA.orderRank !== defB.orderRank) return defA.orderRank - defB.orderRank;
    const name = compareDisplayName(a.organizationLabel, b.organizationLabel);
    if (name !== 0) return name;
    if (a.reasonCode !== b.reasonCode) return a.reasonCode < b.reasonCode ? -1 : 1;
    const cap = compareDisplayName(a.capabilityLabel ?? "", b.capabilityLabel ?? "");
    if (cap !== 0) return cap;
    return compareStableId(a.organizationId, b.organizationId);
  });

  const maxRows = ATTENTION_POLICY_MANIFEST.maxRows;
  const items: AttentionItemView[] = candidates.slice(0, maxRows).map((item) => {
    const def = attentionDefinitionFor(item.reasonCode);
    const view: AttentionItemView = {
      organizationLabel: item.organizationLabel,
      detailHref: item.detailHref,
      category: def.category,
      reasonCode: item.reasonCode,
      humanReason: def.humanReason,
      severity: def.severity,
      freshness: item.freshness,
      actionLabel: def.actionLabel,
      synthetic: true,
    };
    if (item.capabilityLabel) view.capabilityLabel = item.capabilityLabel;
    return view;
  });

  return {
    items: Object.freeze(items),
    total: candidates.length,
    maxRows,
    policyVersion: ATTENTION_POLICY_VERSION,
    explanation:
      "Deterministic attention queue independent of fit ranking. Severity is not a fit score. Bounded preview of review work; not a live feed.",
  };
}

function emptyOpportunityCounts(): Record<OpportunityContextStatus, number> {
  return {
    unknown: 0,
    new_logo: 0,
    cross_sell: 0,
    existing_use: 0,
    renewal_or_reengagement: 0,
    excluded: 0,
  };
}

function buildCapabilityOpportunities(
  model: TenantResearchReadModel,
): readonly CapabilityOpportunityRowView[] {
  return Object.freeze(
    model.capabilityCatalog.map((cap) => {
      const bandBuckets = emptyBandDistribution();
      const byBand = new Map(bandBuckets.map((b) => [b.band, b]));
      const opportunityContexts = emptyOpportunityCounts();
      let assessedCount = 0;
      let insufficientCount = 0;
      const freshnessWarnings: string[] = [];

      for (const org of model.organizations) {
        const assessment = org.capabilityAssessments.find(
          (a) => a.capabilityId === cap.capabilityId,
        );
        if (!assessment) continue;
        const ctx =
          org.portfolio.opportunityContexts.find((c) => c.capabilityId === cap.capabilityId)
            ?.status ?? "unknown";
        opportunityContexts[ctx] += 1;

        if (assessment.fit.status === "insufficient_evidence") {
          insufficientCount += 1;
          continue;
        }
        if (assessment.fit.status === "assessed") {
          assessedCount += 1;
          const bucket = byBand.get(assessment.fit.band);
          if (bucket) bucket.count += 1;
          if (assessment.freshness === "stale") {
            freshnessWarnings.push(`${org.displayName}: stale capability evidence`);
          }
        }
      }

      return {
        capabilityName: cap.name,
        priority: cap.priority,
        assessedCount,
        insufficientCount,
        bandDistribution: Object.freeze(bandBuckets),
        opportunityContexts: Object.freeze(opportunityContexts),
        freshnessWarnings: Object.freeze(freshnessWarnings.slice(0, 3)),
        synthetic: true as const,
      };
    }),
  );
}

function buildChangeSignals(model: TenantResearchReadModel) {
  const rows: Array<ChangeSignalRowView & { organizationId: string; sortKey: string }> = [];

  for (const org of model.organizations) {
    for (const signal of org.changeSignals) {
      const start = signal.effectivePeriod?.start ?? signal.observedAt ?? signal.createdAt;
      const end = signal.effectivePeriod?.end;
      const period = end ? `${start.slice(0, 10)} – ${end.slice(0, 10)}` : start.slice(0, 10);
      rows.push({
        organizationId: org.organizationId,
        organizationName: org.displayName,
        changeLabel: signal.title,
        effectivePeriodLabel: period,
        freshness: signal.freshness,
        epistemicLabel: signal.epistemicStatus.replace(/_/g, " "),
        publicationState: signal.publicationEligibility,
        synthetic: true,
        sortKey: `${signal.freshness === "stale" ? "1" : "0"}|${start}|${org.displayName}`,
      });
    }
  }

  rows.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey < b.sortKey ? -1 : 1;
    return compareStableId(a.organizationId, b.organizationId);
  });

  const maxRows = PRIORITIZATION_POLICY_MANIFEST.changeSignalMaxRows;
  const mapped: ChangeSignalRowView[] = rows.slice(0, maxRows).map((row) => ({
    organizationName: row.organizationName,
    changeLabel: row.changeLabel,
    effectivePeriodLabel: row.effectivePeriodLabel,
    freshness: row.freshness,
    epistemicLabel: row.epistemicLabel,
    publicationState: row.publicationState,
    synthetic: true,
  }));

  return {
    rows: Object.freeze(mapped),
    total: rows.length,
    maxRows,
    explanation:
      "Publication-safe synthetic timing and change evidence for review. Signals do not create demand claims and do not recalculate scores.",
  };
}

function unauthorizedView(message: string): OverviewPageView {
  return {
    verticalLabel: "Financial institutions",
    syntheticNotice: "Synthetic demo dataset unavailable for this authorization context.",
    heuristicDisclaimer: ASSESSMENT_HEURISTIC_DISCLAIMER,
    methodologyVersion: "unavailable",
    datasetVersion: "unavailable",
    asAssessedAt: "unavailable",
    universe: {
      totalOrganizations: 0,
      portfolioAssessed: 0,
      portfolioInsufficientEvidence: 0,
      capabilityAssessments: 0,
      capabilityAssessed: 0,
      capabilityInsufficientEvidence: 0,
      synthetic: true,
    },
    alignmentDistribution: {
      assessedBuckets: emptyBandDistribution(),
      insufficientEvidenceCount: 0,
      assessedTotal: 0,
      synthetic: true,
    },
    shortlist: {
      rows: [],
      totalEligible: 0,
      orderingExplanation: "",
      maxRows: PRIORITIZATION_POLICY_MANIFEST.shortlistMaxRows,
    },
    evidenceReview: {
      rows: [],
      total: 0,
      maxRows: PRIORITIZATION_POLICY_MANIFEST.evidenceReviewMaxRows,
      explanation: "",
    },
    attention: {
      items: [],
      total: 0,
      maxRows: ATTENTION_POLICY_MANIFEST.maxRows,
      policyVersion: ATTENTION_POLICY_VERSION,
      explanation: "",
    },
    capabilityOpportunities: [],
    changeSignals: {
      rows: [],
      total: 0,
      maxRows: PRIORITIZATION_POLICY_MANIFEST.changeSignalMaxRows,
      explanation: "",
    },
    state: "unauthorized",
    stateMessage: message,
  };
}

/**
 * Build the Phase 5 portfolio overview view model.
 * Requires organization:read and assessment:read. Never recalculates Phase 4 scores.
 */
export async function buildOverviewPageView(
  context: AuthorizationContext,
): Promise<OverviewPageView> {
  try {
    const model = getTenantResearchReadModel(context);

    if (model.organizations.length === 0) {
      return {
        ...unauthorizedView("No organizations are available in this tenant."),
        state: "empty_tenant",
        stateMessage: "No organizations are available in this tenant.",
        verticalLabel: model.verticalLabel,
        syntheticNotice: model.syntheticNotice,
        methodologyVersion: model.methodologyVersion,
        datasetVersion: model.datasetVersion,
        asAssessedAt: model.asAssessedAt,
      };
    }

    return {
      verticalLabel: model.verticalLabel,
      syntheticNotice: model.syntheticNotice,
      heuristicDisclaimer: ASSESSMENT_HEURISTIC_DISCLAIMER,
      methodologyVersion: model.methodologyVersion,
      datasetVersion: model.datasetVersion,
      asAssessedAt: model.asAssessedAt,
      universe: buildUniverse(model),
      alignmentDistribution: buildAlignmentDistribution(model),
      shortlist: buildShortlist(model, context),
      evidenceReview: buildEvidenceReview(model),
      attention: buildAttentionQueue(model),
      capabilityOpportunities: buildCapabilityOpportunities(model),
      changeSignals: buildChangeSignals(model),
      state: "ready",
    };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return unauthorizedView("This workspace cannot load the portfolio overview.");
    }
    return {
      ...unauthorizedView("The synthetic research dataset is temporarily unavailable."),
      state: "error",
      stateMessage: "The synthetic research dataset is temporarily unavailable.",
    };
  }
}

/** Test helper — shortlist comparator without UI. */
export function __testCompareShortlist(a: OrgResearchRecord, b: OrgResearchRecord): number {
  return compareShortlist(a, b);
}

export type { ObservedFitBand };
