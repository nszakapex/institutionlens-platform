import { z } from "zod";
import {
  AdapterVersionSchema,
  CapabilityIdSchema,
  PortfolioIdSchema,
  RuleSetIdSchema,
  TenantIdSchema,
  VerticalIdSchema,
} from "@/domain/ids";
import { IsoDateTimeSchema } from "@/domain/schemas/common";
import { PublicationPolicySchema } from "@/domain/schemas/publication";

/** Unit-interval ratio encoded as a decimal string (e.g. "0.50"). */
export const UnitIntervalDecimalSchema = z
  .string()
  .regex(/^(0(\.\d{1,8})?|1(\.0{1,8})?)$/, "Expected unit-interval decimal string");

export const PortfolioStatusSchema = z.enum(["draft", "active", "retired"]);
export type PortfolioStatus = z.infer<typeof PortfolioStatusSchema>;

export const PortfolioCapabilityStatusSchema = z.enum(["enabled", "disabled"]);
export type PortfolioCapabilityStatus = z.infer<typeof PortfolioCapabilityStatusSchema>;

/**
 * Priority normalization (Phase 4):
 * - Priorities are relative weights, not percentages; the sum need not equal 100.
 * - Disabled capabilities are excluded from the weight sum.
 * - weight_i = priority_i / sum(enabled priorities).
 */
export const PortfolioCapabilityRefSchema = z
  .object({
    capabilityId: CapabilityIdSchema,
    status: PortfolioCapabilityStatusSchema,
    priority: z.number().int().min(1).max(100),
    description: z.string().min(1).max(400).optional(),
    ruleSetId: RuleSetIdSchema,
    ruleSetVersion: AdapterVersionSchema,
  })
  .strict();

export type PortfolioCapabilityRef = z.infer<typeof PortfolioCapabilityRefSchema>;

export const AggregationPolicySchema = z
  .object({
    kind: z.literal("priority_weighted_average"),
    minAssessedCapabilityRatio: UnitIntervalDecimalSchema,
    insufficientPortfolioRatio: UnitIntervalDecimalSchema,
    version: z.literal("1.0.0"),
  })
  .strict();

export type AggregationPolicy = z.infer<typeof AggregationPolicySchema>;

export const AssessmentPolicySchema = z
  .object({
    confidencePolicyVersion: AdapterVersionSchema,
    freshnessPolicyVersion: AdapterVersionSchema,
    completenessPolicyVersion: AdapterVersionSchema,
    version: z.literal("1.0.0"),
  })
  .strict();

export type AssessmentPolicy = z.infer<typeof AssessmentPolicySchema>;

export const CapabilityPortfolioSchema = z
  .object({
    id: PortfolioIdSchema,
    tenantId: TenantIdSchema,
    verticalId: VerticalIdSchema,
    adapterVersion: AdapterVersionSchema,
    schemaVersion: z.literal("1.0.0"),
    catalogVersion: AdapterVersionSchema,
    name: z.string().min(1).max(120),
    description: z.string().min(1).max(600),
    status: PortfolioStatusSchema,
    synthetic: z.boolean(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    capabilities: z.array(PortfolioCapabilityRefSchema).min(1).max(20),
    aggregationPolicy: AggregationPolicySchema,
    assessmentPolicy: AssessmentPolicySchema,
    publicationPolicy: PublicationPolicySchema,
  })
  .strict();

export type CapabilityPortfolio = z.infer<typeof CapabilityPortfolioSchema>;
