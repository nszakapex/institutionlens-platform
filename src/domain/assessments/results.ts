import { z } from "zod";
import {
  AdapterVersionSchema,
  AssessmentIdSchema,
  CapabilityIdSchema,
  OrganizationIdSchema,
  PortfolioIdSchema,
  RuleSetIdSchema,
  TenantIdSchema,
  VerticalIdSchema,
} from "@/domain/ids";
import {
  CompletenessStatusSchema,
  ConfidenceLevelSchema,
  FitAssessmentSchema,
  FreshnessStatusSchema,
  ObservedFitBandSchema,
  PublicationEligibilitySchema,
} from "@/domain/schemas/assessment";
import { IsoDateTimeSchema } from "@/domain/schemas/common";
import { RuleLedgerEntrySchema } from "@/domain/assessments/ledger";

export const OpportunityContextStatusSchema = z.enum([
  "unknown",
  "new_logo",
  "cross_sell",
  "existing_use",
  "renewal_or_reengagement",
  "excluded",
]);
export type OpportunityContextStatus = z.infer<typeof OpportunityContextStatusSchema>;

export const OpportunityContextSchema = z
  .object({
    status: OpportunityContextStatusSchema,
    reasonCode: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z][a-z0-9_]*$/, "reasonCode must be lowercase snake_case"),
    capabilityId: CapabilityIdSchema.optional(),
  })
  .strict();

export type OpportunityContext = z.infer<typeof OpportunityContextSchema>;

export const CapabilityAssessmentSchema = z
  .object({
    id: AssessmentIdSchema,
    tenantId: TenantIdSchema,
    organizationId: OrganizationIdSchema,
    portfolioId: PortfolioIdSchema,
    capabilityId: CapabilityIdSchema,
    verticalId: VerticalIdSchema,
    ruleSetId: RuleSetIdSchema,
    ruleSetVersion: AdapterVersionSchema,
    schemaVersion: z.literal("1.0.0"),
    fit: FitAssessmentSchema,
    confidence: ConfidenceLevelSchema,
    freshness: FreshnessStatusSchema,
    completeness: CompletenessStatusSchema,
    publicationEligibility: PublicationEligibilitySchema,
    ledger: z.array(RuleLedgerEntrySchema).max(40),
    assessedAt: IsoDateTimeSchema,
    engineVersion: AdapterVersionSchema,
    synthetic: z.boolean(),
  })
  .strict();

export type CapabilityAssessment = z.infer<typeof CapabilityAssessmentSchema>;

export const PortfolioCapabilityContributionSchema = z
  .object({
    capabilityId: CapabilityIdSchema,
    fit: FitAssessmentSchema,
    priority: z.number().int().min(1).max(100),
    /** Relative weight after priority normalization among enabled capabilities. */
    weight: z
      .string()
      .regex(/^(0(\.\d{1,8})?|1(\.0{1,8})?)$/, "Expected unit-interval decimal string"),
    includedInAggregate: z.boolean(),
  })
  .strict();

export type PortfolioCapabilityContribution = z.infer<typeof PortfolioCapabilityContributionSchema>;

export const PortfolioAssessmentSchema = z
  .object({
    id: AssessmentIdSchema,
    tenantId: TenantIdSchema,
    organizationId: OrganizationIdSchema,
    portfolioId: PortfolioIdSchema,
    verticalId: VerticalIdSchema,
    schemaVersion: z.literal("1.0.0"),
    status: z.enum(["unassessed", "insufficient_evidence", "invalid", "superseded", "assessed"]),
    /** Priority-weighted portfolio prioritization score — not a deal probability. */
    portfolioPriorityScore: z
      .object({
        pointsAwarded: z.number().int().min(0).max(10_000),
        pointsPossible: z.number().int().min(1).max(10_000),
        band: ObservedFitBandSchema,
      })
      .strict()
      .nullable(),
    bestObservedCapabilityFit: z
      .object({
        capabilityId: CapabilityIdSchema,
        fit: FitAssessmentSchema,
      })
      .strict()
      .nullable(),
    capabilityAssessmentIds: z.array(AssessmentIdSchema).max(20),
    contributions: z.array(PortfolioCapabilityContributionSchema).max(20),
    /** Assessed-subset coverage — score is conditional on assessed capabilities. */
    coverage: z
      .object({
        enabledCapabilityCount: z.number().int().min(0).max(20),
        assessedCapabilityCount: z.number().int().min(0).max(20),
        insufficientCapabilityCount: z.number().int().min(0).max(20),
        enabledPriorityWeight: z.number().int().min(0).max(10_000),
        assessedPriorityWeight: z.number().int().min(0).max(10_000),
        conditionalOnAssessedCapabilities: z.boolean(),
      })
      .strict(),
    confidence: ConfidenceLevelSchema,
    freshness: FreshnessStatusSchema,
    completeness: CompletenessStatusSchema,
    publicationEligibility: PublicationEligibilitySchema,
    opportunityContexts: z.array(OpportunityContextSchema).max(20),
    assessedAt: IsoDateTimeSchema,
    engineVersion: AdapterVersionSchema,
    aggregationPolicyVersion: z.literal("1.0.0"),
    synthetic: z.boolean(),
  })
  .strict();

export type PortfolioAssessment = z.infer<typeof PortfolioAssessmentSchema>;
