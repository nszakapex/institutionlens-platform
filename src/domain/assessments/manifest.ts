import { z } from "zod";
import {
  AdapterVersionSchema,
  AssessmentIdSchema,
  EvidenceIdSchema,
  OrganizationIdSchema,
  OverlayIdSchema,
  PortfolioIdSchema,
  RuleSetIdSchema,
  VerticalIdSchema,
  DOMAIN_SCHEMA_VERSION,
} from "@/domain/ids";
import { IsoDateTimeSchema } from "@/domain/schemas/common";

const FingerprintSchema = z
  .string()
  .length(64)
  .regex(/^[a-f0-9]{64}$/, "Expected lowercase hex SHA-256 fingerprint");

export const RuleSetVersionRefSchema = z
  .object({
    ruleSetId: RuleSetIdSchema,
    version: AdapterVersionSchema,
  })
  .strict();

export type RuleSetVersionRef = z.infer<typeof RuleSetVersionRefSchema>;

/**
 * Immutable assessment-run manifest for reproducibility.
 * Must not include secrets, private notes, raw tenant names, or machine paths.
 */
export const AssessmentManifestSchema = z
  .object({
    assessmentId: AssessmentIdSchema,
    /** Opaque tenant-safe context reference — not a raw tenant display name. */
    tenantContextRef: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z][a-z0-9_]*$/, "tenantContextRef must be lowercase snake_case"),
    domainSchemaVersion: z.literal(DOMAIN_SCHEMA_VERSION),
    engineVersion: AdapterVersionSchema,
    verticalId: VerticalIdSchema,
    adapterVersion: AdapterVersionSchema,
    datasetFixtureVersion: AdapterVersionSchema,
    capabilityCatalogVersion: AdapterVersionSchema,
    portfolioId: PortfolioIdSchema,
    portfolioVersion: AdapterVersionSchema,
    ruleSetVersions: z.array(RuleSetVersionRefSchema).min(1).max(20),
    confidencePolicyVersion: AdapterVersionSchema,
    freshnessPolicyVersion: AdapterVersionSchema,
    completenessPolicyVersion: AdapterVersionSchema,
    publicationPolicyVersion: AdapterVersionSchema,
    assessedAt: IsoDateTimeSchema,
    organizationId: OrganizationIdSchema,
    evidenceIds: z.array(EvidenceIdSchema).max(200),
    evidenceFingerprint: FingerprintSchema,
    overlayId: OverlayIdSchema.optional(),
    overlayVersion: AdapterVersionSchema.optional(),
    outputFingerprint: FingerprintSchema,
    synthetic: z.boolean(),
  })
  .strict();

export type AssessmentManifest = z.infer<typeof AssessmentManifestSchema>;
