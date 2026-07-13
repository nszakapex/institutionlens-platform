/**
 * Phase 5 attention policy — deterministic review queue independent of fit ranking.
 * Attention severity is not a fit score. No hidden composite attention score.
 */
export const ATTENTION_POLICY_VERSION = "1.0.0" as const;

export const ATTENTION_REASON_CODES = [
  "insufficient_evidence",
  "stale_supporting_evidence",
  "low_confidence_assessment",
  "publication_review_required",
  "restricted_publication",
  "ambiguous_overlay_match",
  "synthetic_cross_sell_context",
  "material_change_signal",
  "high_observed_alignment_low_confidence",
] as const;

export type AttentionReasonCode = (typeof ATTENTION_REASON_CODES)[number];

export type AttentionSeverityClass = "critical" | "high" | "moderate" | "advisory";

export type AttentionReasonDefinition = {
  code: AttentionReasonCode;
  category: string;
  severity: AttentionSeverityClass;
  /** Lower = higher priority in the queue. */
  orderRank: number;
  humanReason: string;
  actionLabel: string;
};

export const ATTENTION_REASON_DEFINITIONS: readonly AttentionReasonDefinition[] = Object.freeze([
  {
    code: "insufficient_evidence",
    category: "Evidence review",
    severity: "critical",
    orderRank: 10,
    humanReason: "Portfolio assessment could not be completed due to insufficient evidence.",
    actionLabel: "Review evidence",
  },
  {
    code: "restricted_publication",
    category: "Publication",
    severity: "critical",
    orderRank: 20,
    humanReason: "Publication eligibility is restricted; internal review is required.",
    actionLabel: "Review publication state",
  },
  {
    code: "publication_review_required",
    category: "Publication",
    severity: "high",
    orderRank: 30,
    humanReason: "Publication eligibility requires review before external use.",
    actionLabel: "Review publication state",
  },
  {
    code: "high_observed_alignment_low_confidence",
    category: "Confidence",
    severity: "high",
    orderRank: 40,
    humanReason: "Strong or meaningful observed alignment with low confidence requires caution.",
    actionLabel: "Review confidence basis",
  },
  {
    code: "stale_supporting_evidence",
    category: "Freshness",
    severity: "high",
    orderRank: 50,
    humanReason: "Supporting evidence is stale; results remain visible with a freshness warning.",
    actionLabel: "Review evidence freshness",
  },
  {
    code: "low_confidence_assessment",
    category: "Confidence",
    severity: "moderate",
    orderRank: 60,
    humanReason: "Assessment confidence is low and should be reviewed before prioritization use.",
    actionLabel: "Review confidence basis",
  },
  {
    code: "ambiguous_overlay_match",
    category: "Overlay match",
    severity: "moderate",
    orderRank: 70,
    humanReason: "Tenant overlay match is ambiguous and needs human confirmation.",
    actionLabel: "Review overlay match",
  },
  {
    code: "material_change_signal",
    category: "Change signal",
    severity: "moderate",
    orderRank: 80,
    humanReason: "A material synthetic change signal is available for review.",
    actionLabel: "Review change signal",
  },
  {
    code: "synthetic_cross_sell_context",
    category: "Opportunity context",
    severity: "advisory",
    orderRank: 90,
    humanReason:
      "Synthetic overlay indicates an additional-capability (cross-sell) opportunity context.",
    actionLabel: "Review opportunity context",
  },
]);

export const ATTENTION_POLICY_MANIFEST = Object.freeze({
  version: ATTENTION_POLICY_VERSION,
  phase: 5,
  maxRows: 10,
  reasonCodes: ATTENTION_REASON_CODES,
  definitions: ATTENTION_REASON_DEFINITIONS,
  order: Object.freeze([
    "severity_order_rank_asc",
    "display_name_asc",
    "reason_code_asc",
    "capability_label_asc",
    "stable_internal_id_hidden_tiebreaker",
  ]),
  notes: Object.freeze([
    "Attention severity is independent of portfolio fit score.",
    "No composite attention score is computed.",
    "Opportunity context never becomes a transaction recommendation.",
    "Restricted evidence contents are never displayed.",
  ]),
});

const BY_CODE = new Map(ATTENTION_REASON_DEFINITIONS.map((item) => [item.code, item]));

export function attentionDefinitionFor(code: AttentionReasonCode): AttentionReasonDefinition {
  const found = BY_CODE.get(code);
  if (!found) {
    throw new Error(`Unknown attention reason code: ${code}`);
  }
  return found;
}
