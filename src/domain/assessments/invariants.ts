import { AssessmentInvariantError } from "@/domain/errors";
import type { CapabilityAssessment } from "@/domain/assessments/results";
import type { RuleLedgerEntry } from "@/domain/assessments/ledger";
import type { FitAssessment } from "@/domain/schemas/assessment";

export function assertScoreWithinMax(pointsAwarded: number, pointsPossible: number): void {
  if (!Number.isInteger(pointsAwarded) || !Number.isInteger(pointsPossible)) {
    throw new AssessmentInvariantError(
      "Assessment scores must use integer points.",
      "score_not_integer",
    );
  }
  if (pointsPossible < 1) {
    throw new AssessmentInvariantError(
      "Declared possible points must be positive.",
      "points_possible_invalid",
    );
  }
  if (pointsAwarded < 0 || pointsAwarded > pointsPossible) {
    throw new AssessmentInvariantError(
      "Awarded points must stay within the declared maximum.",
      "score_out_of_range",
    );
  }
}

/**
 * Every awarded point must appear in the ledger; no hidden bonuses.
 */
export function assertNoHiddenPoints(fit: FitAssessment, ledger: readonly RuleLedgerEntry[]): void {
  const ledgerTotal = ledger.reduce((sum, entry) => sum + entry.pointsAwarded, 0);

  if (fit.status === "assessed") {
    if (ledgerTotal !== fit.pointsAwarded) {
      throw new AssessmentInvariantError(
        "Ledger points must match the assessed score.",
        "hidden_or_mismatched_points",
      );
    }
    return;
  }

  if (ledgerTotal !== 0 && fit.status !== "insufficient_evidence") {
    throw new AssessmentInvariantError(
      "Non-assessed results cannot retain unexplained points.",
      "points_without_assessed_status",
    );
  }
}

export function assertCapabilityAssessmentInvariants(assessment: CapabilityAssessment): void {
  const { fit, ledger } = assessment;

  if (fit.status === "assessed") {
    assertScoreWithinMax(fit.pointsAwarded, fit.pointsPossible);
    assertNoHiddenPoints(fit, ledger);

    if (ledger.some((entry) => entry.outcome === "invalid_input")) {
      throw new AssessmentInvariantError(
        "Invalid rule input cannot produce an assessed result.",
        "invalid_input_assessed",
      );
    }
    return;
  }

  if (fit.status === "insufficient_evidence") {
    assertNoHiddenPoints(fit, ledger);
    return;
  }

  if (fit.status === "invalid") {
    if (!ledger.some((entry) => entry.outcome === "invalid_input")) {
      throw new AssessmentInvariantError(
        "Invalid assessments require an invalid_input ledger outcome.",
        "invalid_without_ledger_marker",
      );
    }
    return;
  }

  if (fit.status === "unassessed" || fit.status === "superseded") {
    if (ledger.length > 0 && fit.status === "unassessed") {
      throw new AssessmentInvariantError(
        "Unassessed results must not carry a ledger.",
        "unassessed_with_ledger",
      );
    }
  }
}
