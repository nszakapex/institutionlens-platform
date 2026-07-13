import { z } from "zod";

/** Separate assessment dimensions — never merge into a trust score. */

export const ObservedFitBandSchema = z.enum([
  "limited_observed_alignment",
  "emerging_observed_alignment",
  "meaningful_observed_alignment",
  "strong_observed_alignment",
]);
export type ObservedFitBand = z.infer<typeof ObservedFitBandSchema>;

export const FitAssessmentSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("unassessed") }).strict(),
  z.object({ status: z.literal("insufficient_evidence") }).strict(),
  z.object({ status: z.literal("invalid") }).strict(),
  z.object({ status: z.literal("superseded") }).strict(),
  z
    .object({
      status: z.literal("assessed"),
      pointsAwarded: z.number().int().min(0).max(10_000),
      pointsPossible: z.number().int().min(1).max(10_000),
      band: ObservedFitBandSchema,
    })
    .strict(),
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
