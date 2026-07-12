import { z } from "zod";
import { PrincipalIdSchema, TenantIdSchema, VerticalIdSchema } from "@/domain/ids";
import { DataClassificationSchema, IsoDateTimeSchema } from "@/domain/schemas/common";

export const TenantStatusSchema = z.enum(["active", "suspended"]);
export type TenantStatus = z.infer<typeof TenantStatusSchema>;

export const TenantSchema = z.object({
  id: TenantIdSchema,
  displayName: z.string().min(1).max(120),
  status: TenantStatusSchema,
  allowedVerticalIds: z.array(VerticalIdSchema).min(1).max(20),
  createdAt: IsoDateTimeSchema,
  dataClassification: DataClassificationSchema,
  demo: z.boolean(),
});

export type Tenant = z.infer<typeof TenantSchema>;

export const PrincipalRoleSchema = z.enum(["analyst", "reviewer", "administrator"]);
export type PrincipalRole = z.infer<typeof PrincipalRoleSchema>;

export const PrincipalStatusSchema = z.enum(["active", "suspended"]);
export type PrincipalStatus = z.infer<typeof PrincipalStatusSchema>;

export const PrincipalSchema = z.object({
  id: PrincipalIdSchema,
  tenantId: TenantIdSchema,
  displayName: z.string().min(1).max(120),
  role: PrincipalRoleSchema,
  status: PrincipalStatusSchema,
  demo: z.boolean(),
});

export type Principal = z.infer<typeof PrincipalSchema>;
