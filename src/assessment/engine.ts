import type {
  AssessmentId,
  LedgerEntryId,
  OrganizationId,
  PortfolioId,
  TenantId,
} from "@/domain/ids";
import type { AssessmentRule, RuleSet } from "@/domain/assessments/rules";
import { RuleSetSchema } from "@/domain/assessments/rules";
import {
  RuleLedgerEntrySchema,
  type ProvenanceSummary,
  type RuleLedgerEntry,
  type RuleOutcome,
} from "@/domain/assessments/ledger";
import {
  CapabilityAssessmentSchema,
  type CapabilityAssessment,
} from "@/domain/assessments/results";
import {
  ENGINE_VERSION,
  classifyCompleteness,
  classifyConfidence,
  classifyFreshness,
  classifyPublicationEligibility,
} from "@/domain/assessments/quality";
import { bandFromPoints } from "@/domain/assessments/score";
import { assertCapabilityAssessmentInvariants } from "@/domain/assessments/invariants";
import type { FitAssessment, PublicationEligibility } from "@/domain/schemas/assessment";
import type { EvidenceRecord } from "@/domain/schemas/evidence";
import type { EvaluationContext } from "@/assessment/context";
import { evaluatePredicate } from "@/assessment/predicates";

export type EvaluateCapabilityAssessmentInput = {
  assessmentId: AssessmentId;
  tenantId: TenantId;
  organizationId: OrganizationId;
  portfolioId: PortfolioId;
  ruleSet: RuleSet;
  context: EvaluationContext;
  engineVersion?: string;
};

const PUBLICATION_RANK: Record<PublicationEligibility, number> = {
  restricted: 0,
  review_required: 1,
  internal_only: 2,
  eligible: 3,
};

function uniqueSorted(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort();
}

function ledgerEntryIdForRule(ruleId: string): LedgerEntryId {
  const body = ruleId.startsWith("rule_") ? ruleId.slice(5) : ruleId;
  const clipped = body.slice(0, 48);
  return `ledger_${clipped}` as LedgerEntryId;
}

function isStaleEvidence(record: EvidenceRecord): boolean {
  return record.epistemicStatus === "stale" || record.freshness === "stale";
}

function isRestrictedEvidence(record: EvidenceRecord, ctx: EvaluationContext): boolean {
  if (record.publicationEligibility === "restricted") {
    return true;
  }
  if (!record.provenanceId) {
    return false;
  }
  const provenance = ctx.provenanceById.get(record.provenanceId);
  return provenance?.accessClassification === "restricted";
}

function worstPublication(records: readonly EvidenceRecord[]): PublicationEligibility {
  if (records.length === 0) {
    return "internal_only";
  }
  let worst: PublicationEligibility = "eligible";
  for (const record of records) {
    if (PUBLICATION_RANK[record.publicationEligibility] < PUBLICATION_RANK[worst]) {
      worst = record.publicationEligibility;
    }
  }
  return worst === "eligible" ? "internal_only" : worst;
}

function provenanceSummariesFor(
  records: readonly EvidenceRecord[],
  ctx: EvaluationContext,
): ProvenanceSummary[] {
  const summaries: ProvenanceSummary[] = [];
  for (const record of records) {
    if (!record.provenanceId) continue;
    if (record.tenantId !== ctx.tenantId) continue;
    if (record.organizationId !== ctx.organizationId) continue;
    const provenance = ctx.provenanceById.get(record.provenanceId);
    if (!provenance) continue;
    if (provenance.tenantId !== ctx.tenantId) continue;
    summaries.push({
      validationStatus: provenance.validationStatus,
      licenseStatus: provenance.licenseStatus,
      accessClassification: provenance.accessClassification,
    });
  }
  return summaries.slice(0, 20);
}

function hasValidatedSameTenantLineage(
  evidenceIds: readonly string[],
  ctx: EvaluationContext,
): boolean {
  for (const evidenceId of evidenceIds) {
    const record = ctx.evidence.find((item) => item.id === evidenceId);
    if (!record) continue;
    if (record.tenantId !== ctx.tenantId) continue;
    if (record.organizationId !== ctx.organizationId) continue;
    if (!record.provenanceId) continue;
    const provenance = ctx.provenanceById.get(record.provenanceId);
    if (!provenance) continue;
    if (provenance.tenantId !== ctx.tenantId) continue;
    if (provenance.validationStatus === "validated") {
      return true;
    }
  }
  return false;
}

function buildLedgerEntry(input: {
  rule: AssessmentRule;
  outcome: RuleOutcome;
  pointsAwarded: number;
  reason: string;
  reasonCode: string;
  evidenceIds: string[];
  supporting: readonly EvidenceRecord[];
  ctx: EvaluationContext;
  engineVersion: string;
}): RuleLedgerEntry {
  const {
    rule,
    outcome,
    pointsAwarded,
    reason,
    reasonCode,
    evidenceIds,
    supporting,
    ctx,
    engineVersion,
  } = input;

  return RuleLedgerEntrySchema.parse({
    id: ledgerEntryIdForRule(rule.ruleId),
    ruleId: rule.ruleId,
    ruleSetVersion: rule.ruleSetVersion,
    capabilityId: rule.capabilityId,
    factorCategory: rule.factorCategory,
    outcome,
    pointsAwarded,
    maximumPoints: rule.maximumPoints,
    reason,
    reasonCode,
    evidenceIds: uniqueSorted(evidenceIds).slice(0, 20),
    provenanceSummaries: provenanceSummariesFor(supporting, ctx),
    epistemicStates: uniqueSorted(supporting.map((record) => record.epistemicStatus)).slice(0, 20),
    freshnessStates: uniqueSorted(supporting.map((record) => record.freshness)).slice(0, 20),
    publicationEligibility: worstPublication(supporting),
    evaluatedAt: ctx.assessedAt,
    engineVersion,
    synthetic: true,
  });
}

function gatesSatisfied(ruleSet: RuleSet, evidence: readonly EvidenceRecord[]): boolean {
  for (const gate of ruleSet.requiredGates) {
    for (const evidenceType of gate.requiredEvidenceTypes) {
      const present = evidence.some(
        (record) => record.evidenceType === evidenceType && record.epistemicStatus !== "missing",
      );
      if (!present) {
        return false;
      }
    }
  }
  return true;
}

function evaluateRule(
  rule: AssessmentRule,
  ctx: EvaluationContext,
  engineVersion: string,
): RuleLedgerEntry {
  if (!rule.enabled) {
    return buildLedgerEntry({
      rule,
      outcome: "rule_disabled",
      pointsAwarded: 0,
      reason: "Rule disabled in this rule-set version.",
      reasonCode: "rule_disabled",
      evidenceIds: [],
      supporting: [],
      ctx,
      engineVersion,
    });
  }

  const requirements = rule.evidenceRequirements;
  const requiredTypes = requirements.requiredEvidenceTypes;
  const allEvidence = ctx.evidence;

  if (requiredTypes.length > 0) {
    for (const evidenceType of requiredTypes) {
      if (!allEvidence.some((record) => record.evidenceType === evidenceType)) {
        return buildLedgerEntry({
          rule,
          outcome: "not_evaluated_missing",
          pointsAwarded: 0,
          reason: "Required evidence type is absent for this rule.",
          reasonCode: "missing_evidence_type",
          evidenceIds: [],
          supporting: [],
          ctx,
          engineVersion,
        });
      }
    }
  }

  let candidates =
    requiredTypes.length > 0
      ? allEvidence.filter((record) => requiredTypes.includes(record.evidenceType))
      : [...allEvidence];

  if (!requirements.allowInference) {
    const withoutInference = candidates.filter((record) => record.epistemicStatus !== "inference");
    if (withoutInference.length < candidates.length) {
      const usableWithout = withoutInference.filter(
        (record) => record.epistemicStatus !== "missing",
      );
      if (usableWithout.length === 0) {
        return buildLedgerEntry({
          rule,
          outcome: "not_evaluated_missing",
          pointsAwarded: 0,
          reason: "Inference evidence is not permitted for this rule.",
          reasonCode: "inference_not_permitted",
          evidenceIds: uniqueSorted(
            candidates
              .filter((record) => record.epistemicStatus === "inference")
              .map((record) => record.id),
          ),
          supporting: candidates.filter((record) => record.epistemicStatus === "inference"),
          ctx,
          engineVersion,
        });
      }
    }
    candidates = withoutInference;
  }

  const usable = candidates.filter((record) => record.epistemicStatus !== "missing");

  if (
    usable.length > 0 &&
    usable.every(isStaleEvidence) &&
    !requirements.allowStale &&
    rule.staleEvidenceBehavior === "not_evaluated_stale"
  ) {
    return buildLedgerEntry({
      rule,
      outcome: "not_evaluated_stale",
      pointsAwarded: 0,
      reason: "Only stale evidence is available for this rule.",
      reasonCode: "stale_evidence",
      evidenceIds: uniqueSorted(usable.map((record) => record.id)),
      supporting: usable,
      ctx,
      engineVersion,
    });
  }

  if (
    usable.length > 0 &&
    usable.every((record) => isRestrictedEvidence(record, ctx)) &&
    !requirements.allowRestrictedInternal &&
    rule.restrictedEvidenceBehavior === "not_evaluated_restricted"
  ) {
    return buildLedgerEntry({
      rule,
      outcome: "not_evaluated_restricted",
      pointsAwarded: 0,
      reason: "Only restricted evidence is available for this rule.",
      reasonCode: "restricted_evidence",
      evidenceIds: uniqueSorted(usable.map((record) => record.id)),
      supporting: usable,
      ctx,
      engineVersion,
    });
  }

  if (requirements.requireValidatedProvenance) {
    for (const record of usable) {
      if (!record.provenanceId) {
        return buildLedgerEntry({
          rule,
          outcome: "invalid_input",
          pointsAwarded: 0,
          reason: "Validated provenance is required but missing.",
          reasonCode: "invalid_provenance",
          evidenceIds: [record.id],
          supporting: [record],
          ctx,
          engineVersion,
        });
      }
      const provenance = ctx.provenanceById.get(record.provenanceId);
      if (
        !provenance ||
        provenance.validationStatus === "rejected" ||
        provenance.validationStatus === "unvalidated"
      ) {
        return buildLedgerEntry({
          rule,
          outcome: "invalid_input",
          pointsAwarded: 0,
          reason: "Validated provenance is required but unavailable.",
          reasonCode: "invalid_provenance",
          evidenceIds: [record.id],
          supporting: [record],
          ctx,
          engineVersion,
        });
      }
    }
  }

  const predicateResult = evaluatePredicate(rule.predicate, ctx, ctx.allowlistedFields);

  if (predicateResult.missingField) {
    return buildLedgerEntry({
      rule,
      outcome: "not_evaluated_missing",
      pointsAwarded: 0,
      reason: "Required observation field is missing for this rule.",
      reasonCode: "missing_field",
      evidenceIds: predicateResult.usedEvidenceIds,
      supporting: candidates.filter((record) =>
        predicateResult.usedEvidenceIds.includes(record.id),
      ),
      ctx,
      engineVersion,
    });
  }

  const evidenceIds = uniqueSorted(predicateResult.usedEvidenceIds);
  const supporting = candidates.filter((record) => evidenceIds.includes(record.id));

  if (predicateResult.ok) {
    if (evidenceIds.length === 0) {
      return buildLedgerEntry({
        rule,
        outcome: "not_evaluated_missing",
        pointsAwarded: 0,
        reason: "Rule matched without traceable scoring-input lineage.",
        reasonCode: "missing_lineage",
        evidenceIds: [],
        supporting: [],
        ctx,
        engineVersion,
      });
    }
    if (!hasValidatedSameTenantLineage(evidenceIds, ctx)) {
      return buildLedgerEntry({
        rule,
        outcome: "invalid_input",
        pointsAwarded: 0,
        reason: "Awarded points require validated same-tenant provenance lineage.",
        reasonCode: "invalid_lineage",
        evidenceIds,
        supporting,
        ctx,
        engineVersion,
      });
    }
    return buildLedgerEntry({
      rule,
      outcome: "awarded",
      pointsAwarded: rule.maximumPoints,
      reason: "Rule condition satisfied.",
      reasonCode: "awarded",
      evidenceIds,
      supporting,
      ctx,
      engineVersion,
    });
  }

  return buildLedgerEntry({
    rule,
    outcome: "not_awarded",
    pointsAwarded: 0,
    reason: "Rule condition not satisfied.",
    reasonCode: "not_awarded",
    evidenceIds,
    supporting: supporting.length > 0 ? supporting : usable,
    ctx,
    engineVersion,
  });
}

/**
 * Deterministic capability assessment against a validated rule set.
 */
export function evaluateCapabilityAssessment(
  input: EvaluateCapabilityAssessmentInput,
): CapabilityAssessment {
  const ruleSet = RuleSetSchema.parse(input.ruleSet);
  const engineVersion = input.engineVersion ?? ENGINE_VERSION;
  const ctx = input.context;

  const gatesOk = gatesSatisfied(ruleSet, ctx.evidence);
  const sortedRules = [...ruleSet.rules].sort((a, b) => a.ruleId.localeCompare(b.ruleId));

  const ledger: RuleLedgerEntry[] = sortedRules.map((rule) =>
    evaluateRule(rule, ctx, engineVersion),
  );

  const pointsAwarded = ledger.reduce((sum, entry) => sum + entry.pointsAwarded, 0);
  const pointsPossible = ruleSet.declaredMaximumPoints;

  const hasInvalidInput = ledger.some((entry) => entry.outcome === "invalid_input");

  const decidedOutcomes = new Set<RuleOutcome>(["awarded", "not_awarded"]);
  const evaluatedPossiblePoints = ledger
    .filter((entry) => decidedOutcomes.has(entry.outcome))
    .reduce((sum, entry) => sum + entry.maximumPoints, 0);
  const supportedPoints = evaluatedPossiblePoints;
  const unresolvedRequiredRules = ledger.filter((entry) =>
    [
      "not_evaluated_missing",
      "not_evaluated_stale",
      "not_evaluated_restricted",
      "blocked_by_gate",
    ].includes(entry.outcome),
  ).length;

  let fit: FitAssessment;
  if (hasInvalidInput) {
    fit = { status: "invalid" };
  } else if (!gatesOk) {
    fit = { status: "insufficient_evidence" };
  } else {
    fit = {
      status: "assessed",
      pointsAwarded,
      pointsPossible,
      band: bandFromPoints(pointsAwarded, pointsPossible),
    };
  }

  const awardedFreshness = ledger
    .filter((entry) => entry.outcome === "awarded")
    .flatMap((entry) => entry.freshnessStates);

  const epistemicStates = ledger
    .filter((entry) => decidedOutcomes.has(entry.outcome))
    .flatMap((entry) => entry.epistemicStates);

  const assessment = CapabilityAssessmentSchema.parse({
    id: input.assessmentId,
    tenantId: input.tenantId,
    organizationId: input.organizationId,
    portfolioId: input.portfolioId,
    capabilityId: ruleSet.capabilityId,
    verticalId: ruleSet.verticalId,
    ruleSetId: ruleSet.id,
    ruleSetVersion: ruleSet.version,
    schemaVersion: "1.0.0",
    fit,
    confidence: classifyConfidence({
      evaluatedPossiblePoints,
      supportedPoints,
      unresolvedRequiredRules,
      epistemicStates,
    }),
    freshness: classifyFreshness(awardedFreshness),
    completeness: classifyCompleteness({
      declaredPossiblePoints: pointsPossible,
      evaluatedPossiblePoints,
      requiredGatesSatisfied: gatesOk,
      hasInvalidInput,
    }),
    publicationEligibility: classifyPublicationEligibility(ledger),
    ledger,
    assessedAt: ctx.assessedAt,
    engineVersion,
    synthetic: true,
  });

  assertCapabilityAssessmentInvariants(assessment);
  return assessment;
}
