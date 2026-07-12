import { z } from "zod";
import { ProvenanceIdSchema, TenantIdSchema } from "@/domain/ids";
import { DataClassificationSchema, IsoDateTimeSchema } from "@/domain/schemas/common";

export const SourceTypeSchema = z.enum([
  "synthetic_fixture",
  "synthetic_document",
  "synthetic_observation",
]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const LicenseStatusSchema = z.enum(["synthetic_demo", "unknown", "permitted_internal"]);
export type LicenseStatus = z.infer<typeof LicenseStatusSchema>;

export const AccessClassificationSchema = z.enum(["synthetic", "internal", "restricted"]);
export type AccessClassification = z.infer<typeof AccessClassificationSchema>;

export const ValidationStatusSchema = z.enum(["validated", "unvalidated", "rejected"]);
export type ValidationStatus = z.infer<typeof ValidationStatusSchema>;

export const ProvenanceRecordSchema = z
  .object({
    id: ProvenanceIdSchema,
    tenantId: TenantIdSchema,
    sourceType: SourceTypeSchema,
    sourceName: z.string().min(1).max(160),
    /** Safe internal scheme only for synthetic Phase 3 data. */
    sourceReference: z
      .string()
      .min(1)
      .max(240)
      .refine(
        (value) => value.startsWith("synthetic://") || value.endsWith(".example"),
        "Provenance reference must be synthetic:// or .example",
      )
      .refine((value) => !/[?#]/.test(value), "Query tokens and fragments are forbidden")
      .refine(
        (value) => !/^(file:|https?:\/\/(?!.*\.example$))/i.test(value),
        "HTTP(S) and file references are forbidden except .example labels",
      ),
    retrievedAt: IsoDateTimeSchema.nullable(),
    publishedAt: IsoDateTimeSchema.nullable(),
    reportingPeriod: z
      .object({
        start: IsoDateTimeSchema.optional(),
        end: IsoDateTimeSchema.optional(),
      })
      .nullable(),
    checksum: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
    licenseStatus: LicenseStatusSchema,
    accessClassification: AccessClassificationSchema,
    validationStatus: ValidationStatusSchema,
    synthetic: z.literal(true),
    dataClassification: DataClassificationSchema,
    notes: z.string().max(400).optional(),
    createdAt: IsoDateTimeSchema,
    domainSchemaVersion: z.literal("1.0.0"),
  })
  .strict();

export type ProvenanceRecord = z.infer<typeof ProvenanceRecordSchema>;
