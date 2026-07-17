/**
 * Phase 10 ingestion contracts — server-only candidate schemas.
 * These validate offline ETL artifacts. They are not wired into product routes.
 */
import "server-only";

import { z } from "zod";
import {
  AdapterVersionSchema,
  EvidenceIdSchema,
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
import { EvidenceTypeSchema, EpistemicStatusSchema } from "@/domain/schemas/evidence";
import { ObservationValueSchema } from "@/domain/schemas/observation";

export const ImportSourceTypeSchema = z.enum([
  "synthetic_fixture",
  "synthetic_document",
  "synthetic_observation",
  "document",
  "website",
  "regulatory_filing",
  "registry",
  "tenant_provided",
  "calculated",
]);

export const SourceRegistryEntrySchema = z
  .object({
    id: z.string().regex(/^src_[a-z0-9_]{1,48}$/),
    class: z.enum(["offline_fixture", "public_registry", "public_notice", "public_website"]),
    displayName: z.string().min(1).max(160),
    jurisdiction: z.string().min(1).max(64),
    licenseStatus: z.enum(["synthetic_demo", "unknown", "permitted_internal"]),
    defaultAccessClassification: z.enum(["synthetic", "internal", "restricted"]),
    liveFetch: z.boolean(),
    fixtureUri: z
      .string()
      .regex(/^fixture:\/\/[a-z0-9_./-]+$/i)
      .optional(),
    notes: z.string().max(400).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.liveFetch) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phase 10 forbids liveFetch=true registry entries.",
        path: ["liveFetch"],
      });
    }
    if (value.class === "offline_fixture" && !value.fixtureUri) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "offline_fixture requires fixtureUri.",
        path: ["fixtureUri"],
      });
    }
  });

export const SourceRegistrySchema = z
  .object({
    registryVersion: z.string().min(1).max(32),
    policyVersion: z.literal("1.0.0"),
    sources: z.array(SourceRegistryEntrySchema).min(1).max(200),
  })
  .strict();

export type SourceRegistry = z.infer<typeof SourceRegistrySchema>;

export const ProvenanceImportCandidateSchema = z
  .object({
    id: ProvenanceIdSchema,
    tenant_id: TenantIdSchema,
    source_type: ImportSourceTypeSchema,
    source_name: z.string().min(1).max(160),
    source_reference: z
      .string()
      .min(1)
      .max(240)
      .refine((value) => value.startsWith("fixture://") || value.endsWith(".example")),
    retrieved_at: IsoDateTimeSchema.nullable(),
    published_at: IsoDateTimeSchema.nullable(),
    reporting_period: z
      .object({
        start: IsoDateTimeSchema.optional(),
        end: IsoDateTimeSchema.optional(),
      })
      .nullable(),
    checksum: z.string().regex(/^[0-9a-f]{64}$/),
    license_status: z.enum(["synthetic_demo", "unknown", "permitted_internal"]),
    access_classification: z.enum(["synthetic", "internal", "restricted"]),
    validation_status: z.enum(["validated", "unvalidated", "rejected"]),
    synthetic: z.boolean(),
    data_classification: DataClassificationSchema,
    notes: z.string().max(400).nullable(),
    created_at: IsoDateTimeSchema,
    domain_schema_version: z.literal("1.0.0"),
  })
  .strict();

export const EvidenceImportCandidateSchema = z
  .object({
    id: EvidenceIdSchema,
    tenant_id: TenantIdSchema,
    organization_id: OrganizationIdSchema,
    vertical_id: VerticalIdSchema,
    adapter_version: AdapterVersionSchema,
    evidence_type: EvidenceTypeSchema,
    epistemic_status: EpistemicStatusSchema,
    title: z.string().min(1).max(160),
    summary: z.string().min(1).max(600),
    observation: ObservationValueSchema.nullable(),
    observed_at: IsoDateTimeSchema.nullable(),
    effective_period: z
      .object({
        start: IsoDateTimeSchema.optional(),
        end: IsoDateTimeSchema.optional(),
      })
      .nullable(),
    freshness: FreshnessStatusSchema,
    confidence: ConfidenceLevelSchema,
    provenance_id: ProvenanceIdSchema.nullable(),
    publication_eligibility: PublicationEligibilitySchema,
    synthetic: z.boolean(),
    data_classification: DataClassificationSchema,
    created_at: IsoDateTimeSchema,
    updated_at: IsoDateTimeSchema,
    domain_schema_version: z.literal("1.0.0"),
    staleness_reason: z.string().min(1).max(240).nullable().optional(),
    rule_set_ref: z.string().min(1).max(120).nullable().optional(),
    calculation_descriptor: z.string().min(1).max(200).nullable().optional(),
    calculated_from_evidence_ids: z.array(EvidenceIdSchema).max(20).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.publication_eligibility === "eligible") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phase 10 offline candidates cannot be publication-eligible.",
        path: ["publication_eligibility"],
      });
    }
  });

export const ReviewQueueItemSchema = z
  .object({
    review_id: z.string().regex(/^rev_off_[a-z0-9_]{1,64}$/),
    reason_code: z.string().min(1).max(80),
    severity: z.enum(["low", "moderate", "high"]),
    source_id: z.string().regex(/^src_[a-z0-9_]{1,48}$/),
    record_id: z.string().min(1).max(80),
    organization_domain_id: OrganizationIdSchema.nullable(),
    summary: z.string().min(1).max(400),
    recommended_publication: PublicationEligibilitySchema,
    created_at: IsoDateTimeSchema,
  })
  .strict();

export const ImportRunManifestSchema = z
  .object({
    source_key: z.string().min(1).max(120),
    idempotency_key: z.string().regex(/^[0-9a-f]{64}$/),
    input_checksum: z.string().regex(/^[0-9a-f]{64}$/),
    contract_version: z.string().min(1).max(32),
    source_policy_version: z.literal("1.0.0"),
    status: z.enum(["queued", "running", "succeeded", "partial", "failed", "rolled_back"]),
    dry_run: z.boolean(),
    record_counts: z.record(z.string(), z.number().int().min(0).max(10_000)),
    safe_error_summary: z.string().max(240).nullable(),
    pack_id: z.string().min(1).max(80),
    created_at: IsoDateTimeSchema,
  })
  .strict();

export const PipelineArtifactSchema = z
  .object({
    manifest: ImportRunManifestSchema,
    evidence: z.array(EvidenceImportCandidateSchema).max(500),
    provenance: z.array(ProvenanceImportCandidateSchema).max(500),
    reviewQueue: z.array(ReviewQueueItemSchema).max(1000),
    diagnostics: z.array(z.record(z.string(), z.unknown())).max(50),
  })
  .strict();

export type PipelineArtifact = z.infer<typeof PipelineArtifactSchema>;
