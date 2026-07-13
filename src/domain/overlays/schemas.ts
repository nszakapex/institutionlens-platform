import { z } from "zod";
import {
  CapabilityIdSchema,
  OrganizationIdSchema,
  OverlayIdSchema,
  TenantIdSchema,
} from "@/domain/ids";
import { IsoDateTimeSchema } from "@/domain/schemas/common";

export const RelationshipStatusSchema = z.enum([
  "unknown",
  "prospect",
  "active_client",
  "former_client",
  "excluded",
]);
export type RelationshipStatus = z.infer<typeof RelationshipStatusSchema>;

export const CapabilityUsageStatusSchema = z.enum([
  "unknown",
  "not_used",
  "evaluating",
  "active",
  "former",
]);
export type CapabilityUsageStatus = z.infer<typeof CapabilityUsageStatusSchema>;

export const OverlayMatchStatusSchema = z.enum([
  "unreviewed",
  "exact",
  "probable",
  "ambiguous",
  "rejected",
]);
export type OverlayMatchStatus = z.infer<typeof OverlayMatchStatusSchema>;

export const OverlayReviewStatusSchema = z.enum(["unreviewed", "reviewed", "needs_attention"]);
export type OverlayReviewStatus = z.infer<typeof OverlayReviewStatusSchema>;

export const OverlaySourceClassificationSchema = z.enum(["tenant_provided", "synthetic_demo"]);
export type OverlaySourceClassification = z.infer<typeof OverlaySourceClassificationSchema>;

export const CapabilityUsageRecordSchema = z
  .object({
    capabilityId: CapabilityIdSchema,
    usageStatus: CapabilityUsageStatusSchema,
  })
  .strict();

export type CapabilityUsageRecord = z.infer<typeof CapabilityUsageRecordSchema>;

/**
 * Tenant-private organization overlay.
 * `notes` is optional, max 240 chars, and must NEVER appear in public view models.
 * Phase 4 synthetic overlays must use sourceClassification "synthetic_demo".
 */
export const OrganizationOverlaySchema = z
  .object({
    id: OverlayIdSchema,
    tenantId: TenantIdSchema,
    organizationId: OrganizationIdSchema,
    schemaVersion: z.literal("1.0.0"),
    synthetic: z.literal(true),
    relationshipStatus: RelationshipStatusSchema,
    capabilityUsage: z.array(CapabilityUsageRecordSchema).max(12),
    matchStatus: OverlayMatchStatusSchema,
    reviewStatus: OverlayReviewStatusSchema,
    sourceClassification: OverlaySourceClassificationSchema,
    effectiveAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    notes: z.string().min(1).max(240).optional(),
  })
  .strict()
  .refine(
    (overlay) => overlay.sourceClassification === "synthetic_demo",
    "Synthetic Phase 4 overlays must use synthetic_demo source classification",
  );

export type OrganizationOverlay = z.infer<typeof OrganizationOverlaySchema>;
