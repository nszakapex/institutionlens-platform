import "server-only";

import { z } from "zod";
import type { AuthorizationContext } from "@/authorization/context";
import type { Action } from "@/authorization/policy";
import { OrganizationPublicRefSchema } from "@/domain/organization-public-ref";
import { IsoDateTimeSchema } from "@/domain/schemas/common";
import type { PagedResult } from "@/repositories/organization-repository";
import type { OrganizationRepository } from "@/repositories/organization-repository";
import type { AssessmentRepository } from "@/repositories/assessment-repository";
import type { OverlayRepository } from "@/repositories/overlay-repository";
import type { PortfolioRepository } from "@/repositories/portfolio-repository";
import type { DocumentRepository } from "@/repositories/document-repository";

export const REPOSITORY_MAX_PAGE = 10_000;
export const REPOSITORY_MAX_PAGE_SIZE = 50;

const boundedPageFields = {
  page: z.number().int().min(1).max(REPOSITORY_MAX_PAGE).default(1),
  pageSize: z.number().int().min(1).max(REPOSITORY_MAX_PAGE_SIZE).default(12),
};

export const SortDirectionSchema = z.enum(["asc", "desc"]);

export const SavedComparisonPublicRefSchema = z
  .string()
  .min(25)
  .max(37)
  .regex(/^cref_[a-f0-9]{20,32}$/);

export const BriefSnapshotPublicRefSchema = z
  .string()
  .min(26)
  .max(38)
  .regex(/^bsref_[a-f0-9]{20,32}$/);

export type WorkspaceContextRecord = Readonly<{
  tenantId: string;
  principalId: string;
  displayName: string;
  status: "active" | "suspended";
  role: string;
  allowedVerticalIds: readonly string[];
  permissions: readonly Action[];
}>;

export interface WorkspaceRepository {
  getCurrent(context: AuthorizationContext): Promise<WorkspaceContextRecord>;
}

export const SavedComparisonListQuerySchema = z
  .object({
    ...boundedPageFields,
    status: z.enum(["active", "archived"]).optional(),
    sortField: z.enum(["name", "updatedAt"]).default("updatedAt"),
    sortDirection: SortDirectionSchema.default("desc"),
  })
  .strict();

export type SavedComparisonListQueryInput = z.input<typeof SavedComparisonListQuerySchema>;
export type SavedComparisonListQuery = z.output<typeof SavedComparisonListQuerySchema>;

export type SavedComparisonRecord = Readonly<{
  tenantId: string;
  publicRef: z.infer<typeof SavedComparisonPublicRefSchema>;
  name: string;
  status: "active" | "archived";
  organizationRefs: readonly z.infer<typeof OrganizationPublicRefSchema>[];
  createdAt: string;
  updatedAt: string;
}>;

export interface SavedComparisonRepository {
  getByPublicRef(
    context: AuthorizationContext,
    comparisonRef: z.infer<typeof SavedComparisonPublicRefSchema>,
  ): Promise<SavedComparisonRecord>;
  list(
    context: AuthorizationContext,
    query: SavedComparisonListQueryInput,
  ): Promise<PagedResult<SavedComparisonRecord>>;
}

export const BriefSnapshotListQuerySchema = z
  .object({
    ...boundedPageFields,
    organizationRef: OrganizationPublicRefSchema.optional(),
    state: z.enum(["draft", "approved", "archived"]).optional(),
    sortField: z.enum(["createdAt", "updatedAt"]).default("createdAt"),
    sortDirection: SortDirectionSchema.default("desc"),
  })
  .strict();

export type BriefSnapshotListQueryInput = z.input<typeof BriefSnapshotListQuerySchema>;
export type BriefSnapshotListQuery = z.output<typeof BriefSnapshotListQuerySchema>;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type BriefSnapshotRecord = Readonly<{
  tenantId: string;
  publicRef: z.infer<typeof BriefSnapshotPublicRefSchema>;
  organizationRef: z.infer<typeof OrganizationPublicRefSchema>;
  state: "draft" | "approved" | "archived";
  templateVersion: string;
  publicationEligibility: "restricted" | "internal_only" | "review_required" | "eligible";
  contentFingerprint: string;
  content: Readonly<Record<string, JsonValue>>;
  createdAt: string;
  updatedAt: string;
}>;

export interface BriefSnapshotRepository {
  getByPublicRef(
    context: AuthorizationContext,
    briefSnapshotRef: z.infer<typeof BriefSnapshotPublicRefSchema>,
  ): Promise<BriefSnapshotRecord>;
  list(
    context: AuthorizationContext,
    query: BriefSnapshotListQueryInput,
  ): Promise<PagedResult<BriefSnapshotRecord>>;
}

export type RepositoryBundle = Readonly<{
  adapter: "synthetic" | "supabase-postgres";
  workspace: WorkspaceRepository;
  organizations: OrganizationRepository;
  assessments: AssessmentRepository;
  portfolios: PortfolioRepository;
  overlays: OverlayRepository;
  comparisons: SavedComparisonRepository;
  briefSnapshots: BriefSnapshotRepository;
  documents: DocumentRepository;
}>;

export const SavedComparisonRecordSchema = z
  .object({
    tenantId: z.string().min(1).max(64),
    publicRef: SavedComparisonPublicRefSchema,
    name: z.string().min(1).max(120),
    status: z.enum(["active", "archived"]),
    organizationRefs: z.array(OrganizationPublicRefSchema).min(2).max(3),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict()
  .superRefine((record, context) => {
    if (new Set(record.organizationRefs).size !== record.organizationRefs.length) {
      context.addIssue({ code: "custom", path: ["organizationRefs"], message: "Duplicate ref." });
    }
    if (record.updatedAt < record.createdAt) {
      context.addIssue({ code: "custom", path: ["updatedAt"], message: "Invalid order." });
    }
  });

export const BriefSnapshotRecordSchema = z
  .object({
    tenantId: z.string().min(1).max(64),
    publicRef: BriefSnapshotPublicRefSchema,
    organizationRef: OrganizationPublicRefSchema,
    state: z.enum(["draft", "approved", "archived"]),
    templateVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    publicationEligibility: z.enum(["restricted", "internal_only", "review_required", "eligible"]),
    contentFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    content: z.record(z.string(), z.json()),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict()
  .refine((record) => record.updatedAt >= record.createdAt, {
    path: ["updatedAt"],
    message: "Invalid order.",
  });
