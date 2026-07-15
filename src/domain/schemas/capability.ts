import { z } from "zod";
import { CapabilityIdSchema, TenantIdSchema, VerticalIdSchema } from "@/domain/ids";
import { DataClassificationSchema, IsoDateTimeSchema } from "@/domain/schemas/common";
import { DEFAULT_PUBLICATION_POLICY, PublicationPolicySchema } from "@/domain/schemas/publication";

export const CapabilityStatusSchema = z.enum(["active", "draft", "retired"]);
export type CapabilityStatus = z.infer<typeof CapabilityStatusSchema>;

export const CapabilitySchema = z
  .object({
    id: CapabilityIdSchema,
    tenantId: TenantIdSchema,
    verticalId: VerticalIdSchema,
    name: z.string().min(1).max(120),
    description: z.string().min(1).max(600),
    category: z.string().min(1).max(64),
    status: CapabilityStatusSchema,
    synthetic: z.boolean(),
    dataClassification: DataClassificationSchema,
    evidenceRequirements: z.array(z.string().min(1).max(80)).max(12),
    publicationPolicy: PublicationPolicySchema.default(DEFAULT_PUBLICATION_POLICY),
    createdAt: IsoDateTimeSchema,
    domainSchemaVersion: z.literal("1.0.0"),
  })
  .strict();

export type Capability = z.infer<typeof CapabilitySchema>;
