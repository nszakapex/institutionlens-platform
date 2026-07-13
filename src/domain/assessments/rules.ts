import { z } from "zod";
import {
  CapabilityIdSchema,
  RuleIdSchema,
  RuleSetIdSchema,
  VerticalIdSchema,
  AdapterVersionSchema,
} from "@/domain/ids";
import { EvidenceTypeSchema } from "@/domain/schemas/evidence";
import { PredicateSchema, assertPredicateBounds } from "@/domain/assessments/predicates";
import { InvalidRuleDefinitionError } from "@/domain/errors";

export const FactorCategorySchema = z.enum([
  "organizational_profile_fit",
  "capability_alignment",
  "publicly_evidenced_need",
  "timing_change_signals",
  "operational_compatibility",
]);
export type FactorCategory = z.infer<typeof FactorCategorySchema>;

export const EvidenceRequirementsSchema = z
  .object({
    requiredEvidenceTypes: z.array(EvidenceTypeSchema).max(5),
    requireValidatedProvenance: z.boolean(),
    allowStale: z.boolean(),
    allowRestrictedInternal: z.boolean(),
    allowInference: z.boolean(),
  })
  .strict();

export type EvidenceRequirements = z.infer<typeof EvidenceRequirementsSchema>;

export const MissingEvidenceBehaviorSchema = z.literal("not_evaluated_missing");
export const StaleEvidenceBehaviorSchema = z.enum(["not_evaluated_stale", "allow_if_declared"]);
export const RestrictedEvidenceBehaviorSchema = z.enum([
  "not_evaluated_restricted",
  "allow_internal_only",
]);

/** Publication eligibility is derived from supporting evidence, never invented. */
export const RulePublicationPolicySchema = z
  .object({
    impact: z.literal("derived_from_evidence"),
  })
  .strict();

export const AssessmentRuleSchema = z
  .object({
    ruleId: RuleIdSchema,
    ruleSetId: RuleSetIdSchema,
    ruleSetVersion: AdapterVersionSchema,
    verticalId: VerticalIdSchema,
    capabilityId: CapabilityIdSchema,
    factorCategory: FactorCategorySchema,
    title: z.string().min(1).max(160),
    rationale: z.string().min(1).max(600),
    maximumPoints: z.number().int().min(1).max(100),
    evidenceRequirements: EvidenceRequirementsSchema,
    predicate: PredicateSchema,
    missingEvidenceBehavior: MissingEvidenceBehaviorSchema,
    staleEvidenceBehavior: StaleEvidenceBehaviorSchema,
    restrictedEvidenceBehavior: RestrictedEvidenceBehaviorSchema,
    publicationPolicy: RulePublicationPolicySchema,
    enabled: z.boolean(),
    methodologyNotes: z.string().min(1).max(400),
    synthetic: z.literal(true),
  })
  .strict()
  .superRefine((rule, ctx) => {
    try {
      assertPredicateBounds(rule.predicate);
    } catch (error) {
      if (error instanceof InvalidRuleDefinitionError) {
        ctx.addIssue({
          code: "custom",
          message: error.publicMessage,
          path: ["predicate"],
        });
        return;
      }
      throw error;
    }
  });

export type AssessmentRule = z.infer<typeof AssessmentRuleSchema>;

export const RequiredEvidenceGateSchema = z
  .object({
    gateId: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z][a-z0-9_]*$/, "gateId must be lowercase snake_case"),
    description: z.string().min(1).max(240),
    requiredEvidenceTypes: z.array(EvidenceTypeSchema).min(1).max(5),
  })
  .strict();

export type RequiredEvidenceGate = z.infer<typeof RequiredEvidenceGateSchema>;

export const RuleSetSchema = z
  .object({
    id: RuleSetIdSchema,
    version: AdapterVersionSchema,
    verticalId: VerticalIdSchema,
    capabilityId: CapabilityIdSchema,
    /** Prefer exactly 100 for synthetic Phase 4 clarity; any positive int is allowed. */
    declaredMaximumPoints: z.number().int().min(1).max(10_000),
    rules: z.array(AssessmentRuleSchema).min(1).max(40),
    requiredGates: z.array(RequiredEvidenceGateSchema).max(12),
    enabled: z.boolean(),
    synthetic: z.literal(true),
    methodologyVersion: AdapterVersionSchema,
  })
  .strict()
  .superRefine((ruleSet, ctx) => {
    const enabledPoints = ruleSet.rules
      .filter((rule) => rule.enabled)
      .reduce((sum, rule) => sum + rule.maximumPoints, 0);

    if (enabledPoints !== ruleSet.declaredMaximumPoints) {
      ctx.addIssue({
        code: "custom",
        message: "Enabled rule points must equal the declared maximum.",
        path: ["declaredMaximumPoints"],
      });
    }

    for (const rule of ruleSet.rules) {
      if (rule.ruleSetId !== ruleSet.id) {
        ctx.addIssue({
          code: "custom",
          message: "Rule set identifiers must be consistent.",
          path: ["rules"],
        });
        break;
      }
      if (rule.ruleSetVersion !== ruleSet.version) {
        ctx.addIssue({
          code: "custom",
          message: "Rule set versions must be consistent.",
          path: ["rules"],
        });
        break;
      }
      if (rule.capabilityId !== ruleSet.capabilityId || rule.verticalId !== ruleSet.verticalId) {
        ctx.addIssue({
          code: "custom",
          message: "Rule set capability and vertical must be consistent.",
          path: ["rules"],
        });
        break;
      }
    }
  });

export type RuleSet = z.infer<typeof RuleSetSchema>;
