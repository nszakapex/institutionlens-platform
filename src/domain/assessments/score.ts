import { AssessmentInvariantError } from "@/domain/errors";
import { ObservedFitBandSchema, type ObservedFitBand } from "@/domain/schemas/assessment";

/**
 * Map integer points onto observed-alignment bands.
 * When pointsPossible !== 100, scale with integer math:
 * score100 = floor(points * 100 / possible).
 *
 * Thresholds on the 0–100 scale:
 * - 0–24  limited_observed_alignment
 * - 25–49 emerging_observed_alignment
 * - 50–74 meaningful_observed_alignment
 * - 75+   strong_observed_alignment
 */
export function bandFromPoints(points: number, possible: number): ObservedFitBand {
  if (!Number.isInteger(points) || !Number.isInteger(possible)) {
    throw new AssessmentInvariantError(
      "Band classification requires integer points.",
      "band_non_integer",
    );
  }
  if (possible < 1) {
    throw new AssessmentInvariantError(
      "Band classification requires a positive possible-points denominator.",
      "band_invalid_possible",
    );
  }
  if (points < 0 || points > possible) {
    throw new AssessmentInvariantError(
      "Band classification points are out of range.",
      "band_points_out_of_range",
    );
  }

  const score100 = possible === 100 ? points : Math.floor((points * 100) / possible);

  if (score100 <= 24) {
    return ObservedFitBandSchema.parse("limited_observed_alignment");
  }
  if (score100 <= 49) {
    return ObservedFitBandSchema.parse("emerging_observed_alignment");
  }
  if (score100 <= 74) {
    return ObservedFitBandSchema.parse("meaningful_observed_alignment");
  }
  return ObservedFitBandSchema.parse("strong_observed_alignment");
}
