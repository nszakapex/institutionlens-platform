import type {
  CompletenessStatus,
  ConfidenceLevel,
  FreshnessStatus,
  PublicationEligibility,
} from "@/domain/schemas/assessment";
import type { EpistemicStatus } from "@/domain/schemas/evidence";
import type { RuleLedgerEntry } from "@/domain/assessments/ledger";

export const ENGINE_VERSION = "1.0.0" as const;
export const CONFIDENCE_POLICY_VERSION = "1.0.0" as const;
export const FRESHNESS_POLICY_VERSION = "1.0.0" as const;
export const COMPLETENESS_POLICY_VERSION = "1.0.0" as const;
export const PUBLICATION_POLICY_VERSION = "1.0.0" as const;

export type ConfidenceClassificationInput = {
  evaluatedPossiblePoints: number;
  supportedPoints: number;
  unresolvedRequiredRules: number;
  epistemicStates: readonly EpistemicStatus[];
};

/**
 * Deterministic confidence classification (policy v1.0.0).
 * Thresholds: high ≥ 0.80 support ratio, moderate ≥ 0.50, else low;
 * unresolved required rules force low. Confidence measures evidentiary
 * support, never fit magnitude.
 */
export function classifyConfidence(input: ConfidenceClassificationInput): ConfidenceLevel {
  if (input.evaluatedPossiblePoints <= 0) {
    return "unknown";
  }
  if (input.unresolvedRequiredRules > 0) {
    return "low";
  }
  const coverage = input.supportedPoints / input.evaluatedPossiblePoints;
  if (coverage >= 0.8) {
    return "high";
  }
  if (coverage >= 0.5) {
    return "moderate";
  }
  if (coverage > 0) {
    return "low";
  }
  return "unknown";
}

/**
 * Fail-closed freshness: stale supporting evidence cannot yield "current".
 */
export function classifyFreshness(
  supportingFreshness: readonly FreshnessStatus[],
): FreshnessStatus {
  if (supportingFreshness.length === 0) {
    return "unknown";
  }
  if (supportingFreshness.includes("unknown")) {
    return "unknown";
  }
  if (supportingFreshness.includes("stale")) {
    return "stale";
  }
  if (supportingFreshness.includes("aging")) {
    return "aging";
  }
  if (supportingFreshness.every((status) => status === "current")) {
    return "current";
  }
  return "unknown";
}

export type CompletenessClassificationInput = {
  declaredPossiblePoints: number;
  evaluatedPossiblePoints: number;
  requiredGatesSatisfied: boolean;
  hasInvalidInput: boolean;
};

/**
 * Assessment completeness — distinct from organization completeness and evidence-state coverage.
 */
export function classifyCompleteness(input: CompletenessClassificationInput): CompletenessStatus {
  if (input.hasInvalidInput) {
    return "insufficient";
  }
  if (!input.requiredGatesSatisfied || input.declaredPossiblePoints <= 0) {
    return "insufficient";
  }
  if (input.evaluatedPossiblePoints <= 0) {
    return "insufficient";
  }
  if (input.evaluatedPossiblePoints < input.declaredPossiblePoints) {
    return "partial";
  }
  return "sufficient";
}

/**
 * Fail-closed publication eligibility for synthetic Phase 4 outputs.
 * Synthetic assessments are never automatically eligible.
 */
export function classifyPublicationEligibility(
  ledger: readonly RuleLedgerEntry[],
): PublicationEligibility {
  if (ledger.some((entry) => entry.publicationEligibility === "restricted")) {
    return "restricted";
  }
  if (ledger.some((entry) => entry.epistemicStates.includes("inference"))) {
    return "review_required";
  }
  if (ledger.some((entry) => entry.publicationEligibility === "review_required")) {
    return "review_required";
  }
  if (ledger.some((entry) => entry.publicationEligibility === "internal_only")) {
    return "internal_only";
  }
  // Synthetic Phase 4 never auto-promotes to eligible.
  return "internal_only";
}
