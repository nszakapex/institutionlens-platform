export type { EvaluationContext, FieldObservation } from "@/assessment/context";
export {
  canonicalJson,
  fingerprintAssessmentOutput,
  fingerprintEvidence,
  sha256Hex,
} from "@/assessment/fingerprint";
export { evaluatePredicate, type PredicateEvaluationResult } from "@/assessment/predicates";
export { deriveOpportunityContext } from "@/assessment/opportunity";
export {
  evaluateCapabilityAssessment,
  type EvaluateCapabilityAssessmentInput,
} from "@/assessment/engine";
export {
  aggregatePortfolioAssessment,
  type AggregatePortfolioAssessmentInput,
} from "@/assessment/aggregate";
