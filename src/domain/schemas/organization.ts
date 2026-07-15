import { z } from "zod";
import {
  AdapterVersionSchema,
  OrganizationIdSchema,
  TenantIdSchema,
  VerticalIdSchema,
} from "@/domain/ids";
import {
  BoundedTagsSchema,
  DataClassificationSchema,
  ExternalReferenceSchema,
  IsoDateTimeSchema,
  LifecycleStatusSchema,
  LocationSchema,
} from "@/domain/schemas/common";

/**
 * Generic organization — no bank-specific fields.
 * Vertical payloads are validated separately by the adapter schema.
 */
export const OrganizationSchema = z
  .object({
    id: OrganizationIdSchema,
    tenantId: TenantIdSchema,
    verticalId: VerticalIdSchema,
    adapterVersion: AdapterVersionSchema,
    displayName: z.string().min(1).max(160),
    legalName: z.string().min(1).max(200).optional(),
    organizationType: z.string().min(1).max(64),
    lifecycleStatus: LifecycleStatusSchema,
    primaryLocation: LocationSchema,
    summary: z.string().min(1).max(600),
    tags: BoundedTagsSchema,
    externalReferences: z.array(ExternalReferenceSchema).max(8),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    /** Live rows may be non-synthetic; Phase 4 fixtures remain synthetic: true. */
    synthetic: z.boolean(),
    dataClassification: DataClassificationSchema,
    fit: z.object({ status: z.literal("unassessed") }),
    domainSchemaVersion: z.literal("1.0.0"),
    /** Opaque validated vertical payload — shape enforced by adapter before insert. */
    verticalPayload: z.unknown(),
  })
  .strict();

export type Organization = z.infer<typeof OrganizationSchema>;

export function parseOrganization(input: unknown): Organization {
  return OrganizationSchema.parse(input);
}
