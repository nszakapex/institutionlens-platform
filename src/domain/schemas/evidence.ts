import { z } from "zod";
import {
  AdapterVersionSchema,
  OrganizationIdSchema,
  ProvenanceIdSchema,
  TenantIdSchema,
  VerticalIdSchema,
} from "@/domain/ids";
import {
  ConfidenceLevelSchema,
  FreshnessStatusSchema,
  PublicationEligibilitySchema,
} from "@/domain/schemas/assessment";
import { DataClassificationSchema, IsoDateTimeSchema } from "@/domain/schemas/common";
import { ObservationValueSchema } from "@/domain/schemas/observation";
import { EvidenceIdSchema } from "@/domain/ids";

export const EpistemicStatusSchema = z.enum([
  "verified",
  "calculated",
  "rule_based",
  "inference",
  "missing",
  "stale",
]);
export type EpistemicStatus = z.infer<typeof EpistemicStatusSchema>;

export const EvidenceTypeSchema = z.enum([
  "organization_profile",
  "capability_signal",
  "public_change_signal",
  "data_availability",
  "operating_context",
]);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

export const EvidenceRecordSchema = z
  .object({
    id: EvidenceIdSchema,
    tenantId: TenantIdSchema,
    organizationId: OrganizationIdSchema,
    verticalId: VerticalIdSchema,
    adapterVersion: AdapterVersionSchema,
    evidenceType: EvidenceTypeSchema,
    epistemicStatus: EpistemicStatusSchema,
    title: z.string().min(1).max(160),
    summary: z.string().min(1).max(600),
    observation: ObservationValueSchema.nullable(),
    observedAt: IsoDateTimeSchema.nullable(),
    effectivePeriod: z
      .object({
        start: IsoDateTimeSchema.optional(),
        end: IsoDateTimeSchema.optional(),
      })
      .nullable(),
    freshness: FreshnessStatusSchema,
    confidence: ConfidenceLevelSchema,
    provenanceId: ProvenanceIdSchema.nullable(),
    publicationEligibility: PublicationEligibilitySchema,
    synthetic: z.literal(true),
    dataClassification: DataClassificationSchema,
    calculatedFromEvidenceIds: z.array(EvidenceIdSchema).max(20).optional(),
    calculationDescriptor: z.string().min(1).max(200).optional(),
    ruleSetRef: z.string().min(1).max(120).optional(),
    stalenessReason: z.string().min(1).max(240).optional(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    domainSchemaVersion: z.literal("1.0.0"),
  })
  .strict();

export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;
