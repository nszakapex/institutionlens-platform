import { z } from "zod";
import { DocumentIdSchema, OrganizationIdSchema, TenantIdSchema } from "@/domain/ids";
import { IsoDateTimeSchema } from "@/domain/schemas/common";

export const DocumentClassificationSchema = z.enum([
  "research_note",
  "portfolio_list",
  "model_interest",
  "public_filing_export",
  "internal_brief_source",
  "other",
]);

export const DocumentStatusSchema = z.enum([
  "uploaded",
  "under_review",
  "linked",
  "rejected",
  "archived",
]);

export const DocumentContentTypeSchema = z.enum([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export const TenantDocumentSchema = z
  .object({
    id: DocumentIdSchema,
    tenantId: TenantIdSchema,
    title: z.string().min(1).max(160),
    originalFilename: z.string().min(1).max(180),
    classification: DocumentClassificationSchema,
    status: DocumentStatusSchema,
    contentType: DocumentContentTypeSchema,
    byteSize: z
      .number()
      .int()
      .min(1)
      .max(10 * 1024 * 1024),
    organizationId: OrganizationIdSchema.nullable(),
    storageKey: z.string().min(1).max(240),
    checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
    uploadedByPrincipalId: z.string().min(1).max(64),
    notes: z.string().max(240).optional(),
    synthetic: z.boolean(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    domainSchemaVersion: z.literal("1.0.0"),
  })
  .strict()
  .refine((row) => row.updatedAt >= row.createdAt, {
    path: ["updatedAt"],
    message: "Invalid order.",
  });

export type DocumentClassification = z.infer<typeof DocumentClassificationSchema>;
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;
export type DocumentContentType = z.infer<typeof DocumentContentTypeSchema>;
export type TenantDocument = z.infer<typeof TenantDocumentSchema>;

export const DOCUMENT_CLASSIFICATION_LABELS: Record<DocumentClassification, string> = {
  research_note: "Research note",
  portfolio_list: "Portfolio / prospect list",
  model_interest: "Model or analytics interest",
  public_filing_export: "Public filing export",
  internal_brief_source: "Internal brief source",
  other: "Other tenant document",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded: "Uploaded",
  under_review: "Under review",
  linked: "Linked to organization",
  rejected: "Rejected",
  archived: "Archived",
};

/** Allowed upload extensions mapped to content types. */
export const DOCUMENT_UPLOAD_ALLOWLIST = Object.freeze({
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const);

export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
