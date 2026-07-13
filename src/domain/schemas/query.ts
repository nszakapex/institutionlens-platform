import { z } from "zod";
import { VerticalIdSchema } from "@/domain/ids";
import { LifecycleStatusSchema } from "@/domain/schemas/common";
import { FreshnessStatusSchema } from "@/domain/schemas/assessment";

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;

export const OrganizationSortFieldSchema = z.enum([
  "displayName",
  "updatedAt",
  "organizationType",
  "lifecycleStatus",
]);
export type OrganizationSortField = z.infer<typeof OrganizationSortFieldSchema>;

export const SortDirectionSchema = z.enum(["asc", "desc"]);
export type SortDirection = z.infer<typeof SortDirectionSchema>;

export const OrganizationQuerySchema = z
  .object({
    text: z.string().max(80).optional(),
    organizationType: z.string().min(1).max(64).optional(),
    verticalId: VerticalIdSchema.optional(),
    lifecycleStatus: LifecycleStatusSchema.optional(),
    tags: z.array(z.string().min(1).max(40)).max(8).optional(),
    synthetic: z.literal(true).optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    sortField: OrganizationSortFieldSchema.default("displayName"),
    sortDirection: SortDirectionSchema.default("asc"),
    /** Adapter-specific filters — validated by the active adapter; unknown keys rejected. */
    verticalFilters: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type OrganizationQueryInput = z.input<typeof OrganizationQuerySchema>;
export type OrganizationQuery = z.output<typeof OrganizationQuerySchema>;

export const EvidenceQuerySchema = z
  .object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    freshness: FreshnessStatusSchema.optional(),
  })
  .strict();

export type EvidenceQueryInput = z.input<typeof EvidenceQuerySchema>;
export type EvidenceQuery = z.output<typeof EvidenceQuerySchema>;

export const CapabilityQuerySchema = z
  .object({
    verticalId: VerticalIdSchema.optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  })
  .strict();

export type CapabilityQueryInput = z.input<typeof CapabilityQuerySchema>;
export type CapabilityQuery = z.output<typeof CapabilityQuerySchema>;

export const AssessmentListQuerySchema = z
  .object({
    organizationId: z.string().min(1).max(64).optional(),
    capabilityId: z.string().min(1).max(64).optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  })
  .strict();

export type AssessmentListQueryInput = z.input<typeof AssessmentListQuerySchema>;
export type AssessmentListQuery = z.output<typeof AssessmentListQuerySchema>;

export const PortfolioListQuerySchema = z
  .object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  })
  .strict();

export type PortfolioListQueryInput = z.input<typeof PortfolioListQuerySchema>;
export type PortfolioListQuery = z.output<typeof PortfolioListQuerySchema>;

export const OverlayListQuerySchema = z
  .object({
    organizationId: z.string().min(1).max(64).optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  })
  .strict();

export type OverlayListQueryInput = z.input<typeof OverlayListQuerySchema>;
export type OverlayListQuery = z.output<typeof OverlayListQuerySchema>;

export function normalizeSearchText(text: string | undefined): string | undefined {
  if (text === undefined) return undefined;
  const normalized = text.trim().replace(/\s+/g, " ");
  return normalized.length === 0 ? undefined : normalized;
}
