import { z } from "zod";

/** Separate assessment dimensions — never merge into a trust score. */

export const FitAssessmentSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("unassessed") }),
  z.object({
    status: z.literal("assessed"),
    /** Deferred — Phase 3 never produces assessed fit. */
    score: z.never().optional(),
  }),
]);

export type FitAssessment = z.infer<typeof FitAssessmentSchema>;

export const ConfidenceLevelSchema = z.enum(["unknown", "low", "moderate", "high"]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export const FreshnessStatusSchema = z.enum(["unknown", "current", "aging", "stale"]);
export type FreshnessStatus = z.infer<typeof FreshnessStatusSchema>;

export const CompletenessStatusSchema = z.enum([
  "unknown",
  "insufficient",
  "partial",
  "sufficient",
]);
export type CompletenessStatus = z.infer<typeof CompletenessStatusSchema>;

export const PublicationEligibilitySchema = z.enum([
  "restricted",
  "internal_only",
  "review_required",
  "eligible",
]);
export type PublicationEligibility = z.infer<typeof PublicationEligibilitySchema>;

export const UNASSESSED_FIT: FitAssessment = { status: "unassessed" };
