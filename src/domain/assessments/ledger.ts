import { z } from "zod";
import {
  CapabilityIdSchema,
  EvidenceIdSchema,
  LedgerEntryIdSchema,
  RuleIdSchema,
  AdapterVersionSchema,
} from "@/domain/ids";
import { FreshnessStatusSchema, PublicationEligibilitySchema } from "@/domain/schemas/assessment";
import { EpistemicStatusSchema } from "@/domain/schemas/evidence";
import {
  AccessClassificationSchema,
  LicenseStatusSchema,
  ValidationStatusSchema,
} from "@/domain/schemas/provenance";
import { IsoDateTimeSchema } from "@/domain/schemas/common";
import { FactorCategorySchema } from "@/domain/assessments/rules";

export const RuleOutcomeSchema = z.enum([
  "awarded",
  "not_awarded",
  "not_evaluated_missing",
  "not_evaluated_stale",
  "not_evaluated_restricted",
  "blocked_by_gate",
  "rule_disabled",
  "invalid_input",
]);
export type RuleOutcome = z.infer<typeof RuleOutcomeSchema>;

/** Safe provenance summary for internal ledger use — no source URLs or paths. */
export const ProvenanceSummarySchema = z
  .object({
    validationStatus: ValidationStatusSchema,
    licenseStatus: LicenseStatusSchema,
    accessClassification: AccessClassificationSchema,
  })
  .strict();

export type ProvenanceSummary = z.infer<typeof ProvenanceSummarySchema>;

export const RuleLedgerEntrySchema = z
  .object({
    id: LedgerEntryIdSchema,
    ruleId: RuleIdSchema,
    ruleSetVersion: AdapterVersionSchema,
    capabilityId: CapabilityIdSchema,
    factorCategory: FactorCategorySchema,
    outcome: RuleOutcomeSchema,
    pointsAwarded: z.number().int().min(0).max(10_000),
    maximumPoints: z.number().int().min(1).max(100),
    reason: z.string().min(1).max(400),
    reasonCode: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z][a-z0-9_]*$/, "reasonCode must be lowercase snake_case"),
    evidenceIds: z.array(EvidenceIdSchema).max(20),
    provenanceSummaries: z.array(ProvenanceSummarySchema).max(20),
    epistemicStates: z.array(EpistemicStatusSchema).max(20),
    freshnessStates: z.array(FreshnessStatusSchema).max(20),
    publicationEligibility: PublicationEligibilitySchema,
    evaluatedAt: IsoDateTimeSchema,
    engineVersion: AdapterVersionSchema,
    synthetic: z.literal(true),
  })
  .strict()
  .superRefine((entry, ctx) => {
    if (entry.outcome === "awarded") {
      if (entry.pointsAwarded <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "Awarded outcomes require positive points.",
          path: ["pointsAwarded"],
        });
      }
      if (entry.evidenceIds.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Awarded outcomes require supporting evidence.",
          path: ["evidenceIds"],
        });
      }
      if (!entry.provenanceSummaries.some((summary) => summary.validationStatus === "validated")) {
        ctx.addIssue({
          code: "custom",
          message: "Awarded outcomes require validated same-tenant provenance lineage.",
          path: ["provenanceSummaries"],
        });
      }
    }

    if (entry.outcome !== "awarded" && entry.pointsAwarded !== 0) {
      ctx.addIssue({
        code: "custom",
        message: "Non-awarded outcomes cannot award points.",
        path: ["pointsAwarded"],
      });
    }

    if (entry.pointsAwarded > entry.maximumPoints) {
      ctx.addIssue({
        code: "custom",
        message: "Points cannot exceed the rule maximum.",
        path: ["pointsAwarded"],
      });
    }
  });

export type RuleLedgerEntry = z.infer<typeof RuleLedgerEntrySchema>;
