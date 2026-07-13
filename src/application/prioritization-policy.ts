import { z } from "zod";

/**
 * Phase 5 prioritization policy — ordering and bounds only.
 * Does not define fit points, score thresholds, capability weights,
 * confidence thresholds, or opportunity-context rules.
 */
export const PRIORITIZATION_POLICY_VERSION = "1.0.0" as const;

export const PRIORITIZATION_POLICY_MANIFEST = Object.freeze({
  version: PRIORITIZATION_POLICY_VERSION,
  phase: 5,
  shortlistMaxRows: 8,
  evidenceReviewMaxRows: 8,
  attentionMaxRows: 10,
  changeSignalMaxRows: 5,
  defaultHideExcluded: true,
  shortlistEligibility: Object.freeze([
    "portfolio_status_assessed",
    "authorized_tenant",
    "active_vertical_compatible_adapter",
    "not_explicitly_excluded",
    "score_present",
  ]),
  shortlistOrder: Object.freeze([
    "portfolio_priority_score_desc",
    "assessed_priority_weight_coverage_desc",
    "confidence_high_moderate_low_unknown",
    "freshness_current_aging_stale_unknown",
    "display_name_asc",
    "stable_internal_id_hidden_tiebreaker",
  ]),
  evidenceReviewOrder: Object.freeze([
    "unresolved_assessed_priority_weight_desc",
    "insufficient_capability_count_desc",
    "display_name_asc",
  ]),
  notes: Object.freeze([
    "Opportunity context does not change score or shortlist ordering.",
    "Publication eligibility does not change fit score.",
    "Attention severity is not a fit score and has no composite score.",
  ]),
});

export type PrioritizationPolicyManifest = typeof PRIORITIZATION_POLICY_MANIFEST;

export const ConfidenceRankSchema = z.enum(["high", "moderate", "low", "unknown"]);
export const FreshnessRankSchema = z.enum(["current", "aging", "stale", "unknown"]);

const CONFIDENCE_ORDER: Record<string, number> = {
  high: 0,
  moderate: 1,
  low: 2,
  unknown: 3,
};

const FRESHNESS_ORDER: Record<string, number> = {
  current: 0,
  aging: 1,
  stale: 2,
  unknown: 3,
};

export function confidenceRank(value: string): number {
  return CONFIDENCE_ORDER[value] ?? 99;
}

export function freshnessRank(value: string): number {
  return FRESHNESS_ORDER[value] ?? 99;
}

export function compareDisplayName(a: string, b: string): number {
  return a.localeCompare(b, "en", { sensitivity: "base" });
}

export function compareStableId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
