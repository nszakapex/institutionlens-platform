import { z } from "zod";
import { LifecycleStatusSchema } from "@/domain/schemas/common";
import {
  CompletenessStatusSchema,
  ConfidenceLevelSchema,
  FreshnessStatusSchema,
  ObservedFitBandSchema,
  PublicationEligibilitySchema,
} from "@/domain/schemas/assessment";
import { OpportunityContextStatusSchema } from "@/domain/assessments/results";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, normalizeSearchText } from "@/domain/schemas/query";
import {
  BreadthBandSchema,
  ComplexityBandSchema,
  DataAvailabilitySchema,
  InstitutionKindSchema,
  MaturityBandSchema,
  OperatingRegionSchema,
  OwnershipModelSchema,
  ScaleBandSchema,
  ServiceAreaTypeSchema,
} from "@/verticals/financial-institutions/schema";

/** Explorer page sizes — hard maximum remains MAX_PAGE_SIZE (50). */
export const EXPLORER_PAGE_SIZES = [12, 24, 48] as const;
export type ExplorerPageSize = (typeof EXPLORER_PAGE_SIZES)[number];

/** Bound for multi-select values within one filter group. */
export const MAX_MULTI_SELECT = 8;

export const ExplorerSortSchema = z.enum([
  "observed_alignment_desc",
  "observed_alignment_asc",
  "name_asc",
  "name_desc",
  "confidence_desc",
  "freshness_desc",
  "assessment_coverage_desc",
  "organization_type_asc",
]);
export type ExplorerSort = z.infer<typeof ExplorerSortSchema>;

export const AssessmentStatusFilterSchema = z.enum([
  "assessed",
  "insufficient_evidence",
  "unassessed",
  "invalid",
  "superseded",
]);

export const ExclusionPolicySchema = z.enum(["hide_excluded", "include_excluded"]);
export type ExclusionPolicy = z.infer<typeof ExclusionPolicySchema>;

const MultiString = z.array(z.string().min(1).max(64)).max(MAX_MULTI_SELECT);

export const FiVerticalFiltersSchema = z
  .object({
    institutionKind: z.array(InstitutionKindSchema).max(MAX_MULTI_SELECT).optional(),
    scaleBand: z.array(ScaleBandSchema).max(MAX_MULTI_SELECT).optional(),
    operatingRegion: z.array(OperatingRegionSchema).max(MAX_MULTI_SELECT).optional(),
    dataAvailability: z.array(DataAvailabilitySchema).max(MAX_MULTI_SELECT).optional(),
    serviceAreaType: z.array(ServiceAreaTypeSchema).max(MAX_MULTI_SELECT).optional(),
    ownershipModel: z.array(OwnershipModelSchema).max(MAX_MULTI_SELECT).optional(),
    operatingComplexityBand: z.array(ComplexityBandSchema).max(MAX_MULTI_SELECT).optional(),
    digitalServiceMaturity: z.array(MaturityBandSchema).max(MAX_MULTI_SELECT).optional(),
    lendingBreadth: z.array(BreadthBandSchema).max(MAX_MULTI_SELECT).optional(),
  })
  .strict();

export type FiVerticalFilters = z.output<typeof FiVerticalFiltersSchema>;

/**
 * Canonical explorer query — URL search params are the source of truth.
 * AND across filter groups; OR within multi-select values for one group.
 */
export const ExplorerQuerySchema = z
  .object({
    text: z.string().max(100).optional(),
    organizationType: MultiString.optional(),
    lifecycleStatus: z.array(LifecycleStatusSchema).max(MAX_MULTI_SELECT).optional(),
    tags: z.array(z.string().min(1).max(40)).max(MAX_MULTI_SELECT).optional(),
    assessmentStatus: z.array(AssessmentStatusFilterSchema).max(MAX_MULTI_SELECT).optional(),
    observedAlignmentBand: z.array(ObservedFitBandSchema).max(MAX_MULTI_SELECT).optional(),
    confidence: z.array(ConfidenceLevelSchema).max(MAX_MULTI_SELECT).optional(),
    freshness: z.array(FreshnessStatusSchema).max(MAX_MULTI_SELECT).optional(),
    assessmentCompleteness: z.array(CompletenessStatusSchema).max(MAX_MULTI_SELECT).optional(),
    publicationEligibility: z.array(PublicationEligibilitySchema).max(MAX_MULTI_SELECT).optional(),
    opportunityContext: z.array(OpportunityContextStatusSchema).max(MAX_MULTI_SELECT).optional(),
    capabilityId: MultiString.optional(),
    capabilityAssessmentStatus: z
      .array(AssessmentStatusFilterSchema)
      .max(MAX_MULTI_SELECT)
      .optional(),
    verticalFilters: FiVerticalFiltersSchema.optional(),
    exclusionPolicy: ExclusionPolicySchema.default("hide_excluded"),
    sort: ExplorerSortSchema.default("observed_alignment_desc"),
    page: z.number().int().min(1).default(1),
    pageSize: z
      .number()
      .int()
      .refine(
        (n): n is ExplorerPageSize => (EXPLORER_PAGE_SIZES as readonly number[]).includes(n),
        {
          message: "pageSize must be 12, 24, or 48",
        },
      )
      .default(DEFAULT_PAGE_SIZE),
  })
  .strict();

export type ExplorerQueryInput = z.input<typeof ExplorerQuerySchema>;
export type ExplorerQuery = z.output<typeof ExplorerQuerySchema>;

export type ExplorerQueryParseResult =
  | { ok: true; query: ExplorerQuery; unknownParams: readonly string[] }
  | {
      ok: false;
      errorSummary: string;
      issues: readonly string[];
      unknownParams: readonly string[];
      defaults: ExplorerQuery;
    };

const KNOWN_PARAM_KEYS = new Set([
  "q",
  "text",
  "organizationType",
  "lifecycleStatus",
  "tags",
  "assessmentStatus",
  "observedAlignmentBand",
  "confidence",
  "freshness",
  "assessmentCompleteness",
  "publicationEligibility",
  "opportunityContext",
  "capabilityId",
  "capabilityAssessmentStatus",
  "exclusionPolicy",
  "sort",
  "page",
  "pageSize",
  "institutionKind",
  "scaleBand",
  "operatingRegion",
  "dataAvailability",
  "serviceAreaType",
  "ownershipModel",
  "operatingComplexityBand",
  "digitalServiceMaturity",
  "lendingBreadth",
]);

const FI_FILTER_KEYS = [
  "institutionKind",
  "scaleBand",
  "operatingRegion",
  "dataAvailability",
  "serviceAreaType",
  "ownershipModel",
  "operatingComplexityBand",
  "digitalServiceMaturity",
  "lendingBreadth",
] as const;

/**
 * Normalize multi-select params: trim, drop empties, dedupe, sort for determinism.
 * Returns excess:true when unique values exceed MAX_MULTI_SELECT.
 */
export function normalizeMultiValues(value: string | string[] | undefined): {
  values?: string[];
  excess: boolean;
} {
  if (value === undefined) return { excess: false };
  const list = Array.isArray(value) ? value : [value];
  const cleaned = list
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.toLowerCase() !== "any");
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of cleaned) {
    if (seen.has(item)) continue;
    seen.add(item);
    unique.push(item);
  }
  unique.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (unique.length > MAX_MULTI_SELECT) return { excess: true };
  if (unique.length === 0) return { excess: false };
  return { values: unique, excess: false };
}

function asSingle(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const n = Number(value);
  if (!Number.isInteger(n)) return Number.NaN;
  return n;
}

/**
 * Parse URL search params into a validated ExplorerQuery.
 * Unknown parameters do not broaden results; malformed values fail closed.
 */
export function parseExplorerSearchParams(
  params: Record<string, string | string[] | undefined>,
): ExplorerQueryParseResult {
  const unknownParams = Object.keys(params).filter((key) => !KNOWN_PARAM_KEYS.has(key));
  const defaults = ExplorerQuerySchema.parse({});

  const textRaw = asSingle(params.q) ?? asSingle(params.text);
  const text = normalizeSearchText(textRaw);
  if (text !== undefined && text.length > 100) {
    return {
      ok: false,
      errorSummary: "Search text exceeds the maximum length of 100 characters.",
      issues: ["text_too_long"],
      unknownParams,
      defaults,
    };
  }

  const multiFields: Array<[string, string | string[] | undefined]> = [
    ["organizationType", params.organizationType],
    ["lifecycleStatus", params.lifecycleStatus],
    ["tags", params.tags],
    ["assessmentStatus", params.assessmentStatus],
    ["observedAlignmentBand", params.observedAlignmentBand],
    ["confidence", params.confidence],
    ["freshness", params.freshness],
    ["assessmentCompleteness", params.assessmentCompleteness],
    ["publicationEligibility", params.publicationEligibility],
    ["opportunityContext", params.opportunityContext],
    ["capabilityId", params.capabilityId],
    ["capabilityAssessmentStatus", params.capabilityAssessmentStatus],
  ];

  const normalizedMultis: Record<string, string[] | undefined> = {};
  for (const [key, raw] of multiFields) {
    const result = normalizeMultiValues(raw);
    if (result.excess) {
      return {
        ok: false,
        errorSummary: `Too many values for ${key}. Maximum is ${MAX_MULTI_SELECT}.`,
        issues: [`excess:${key}`],
        unknownParams,
        defaults,
      };
    }
    normalizedMultis[key] = result.values;
  }

  const verticalFilters: Record<string, string[]> = {};
  for (const key of FI_FILTER_KEYS) {
    const result = normalizeMultiValues(params[key]);
    if (result.excess) {
      return {
        ok: false,
        errorSummary: `Too many values for ${key}. Maximum is ${MAX_MULTI_SELECT}.`,
        issues: [`excess:${key}`],
        unknownParams,
        defaults,
      };
    }
    if (result.values) verticalFilters[key] = result.values;
  }

  const page = parsePositiveInt(asSingle(params.page), 1);
  const pageSizeRaw = asSingle(params.pageSize);
  const pageSize =
    pageSizeRaw === undefined ? DEFAULT_PAGE_SIZE : parsePositiveInt(pageSizeRaw, Number.NaN);

  if (!Number.isInteger(page) || page < 1) {
    return {
      ok: false,
      errorSummary: "Page must be an integer greater than or equal to 1.",
      issues: ["invalid_page"],
      unknownParams,
      defaults,
    };
  }

  if (pageSizeRaw !== undefined) {
    if (!Number.isInteger(pageSize) || pageSize > MAX_PAGE_SIZE) {
      return {
        ok: false,
        errorSummary: "Page size must be 12, 24, or 48 (maximum 50).",
        issues: ["invalid_page_size"],
        unknownParams,
        defaults,
      };
    }
    if (!(EXPLORER_PAGE_SIZES as readonly number[]).includes(pageSize)) {
      return {
        ok: false,
        errorSummary: "Page size must be 12, 24, or 48.",
        issues: ["invalid_page_size"],
        unknownParams,
        defaults,
      };
    }
  }

  const candidate: ExplorerQueryInput = {
    ...(text !== undefined ? { text } : {}),
    organizationType: normalizedMultis.organizationType,
    lifecycleStatus: normalizedMultis.lifecycleStatus as ExplorerQueryInput["lifecycleStatus"],
    tags: normalizedMultis.tags,
    assessmentStatus: normalizedMultis.assessmentStatus as ExplorerQueryInput["assessmentStatus"],
    observedAlignmentBand:
      normalizedMultis.observedAlignmentBand as ExplorerQueryInput["observedAlignmentBand"],
    confidence: normalizedMultis.confidence as ExplorerQueryInput["confidence"],
    freshness: normalizedMultis.freshness as ExplorerQueryInput["freshness"],
    assessmentCompleteness:
      normalizedMultis.assessmentCompleteness as ExplorerQueryInput["assessmentCompleteness"],
    publicationEligibility:
      normalizedMultis.publicationEligibility as ExplorerQueryInput["publicationEligibility"],
    opportunityContext:
      normalizedMultis.opportunityContext as ExplorerQueryInput["opportunityContext"],
    capabilityId: normalizedMultis.capabilityId,
    capabilityAssessmentStatus:
      normalizedMultis.capabilityAssessmentStatus as ExplorerQueryInput["capabilityAssessmentStatus"],
    ...(Object.keys(verticalFilters).length > 0 ? { verticalFilters } : {}),
    exclusionPolicy: (asSingle(params.exclusionPolicy) ??
      "hide_excluded") as ExplorerQueryInput["exclusionPolicy"],
    sort: (asSingle(params.sort) ?? "observed_alignment_desc") as ExplorerQueryInput["sort"],
    page,
    pageSize: pageSize as ExplorerPageSize,
  };

  const parsed = ExplorerQuerySchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      errorSummary: "One or more filters are invalid or unsupported.",
      issues: parsed.error.issues.map((issue) => issue.path.join(".") || issue.code),
      unknownParams,
      defaults,
    };
  }

  return { ok: true, query: parsed.data, unknownParams };
}

export function explorerQueryToSearchParams(query: ExplorerQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.text) params.set("q", query.text);
  const multi = (key: string, values: readonly string[] | undefined) => {
    if (!values) return;
    for (const value of values) params.append(key, value);
  };
  multi("organizationType", query.organizationType);
  multi("lifecycleStatus", query.lifecycleStatus);
  multi("tags", query.tags);
  multi("assessmentStatus", query.assessmentStatus);
  multi("observedAlignmentBand", query.observedAlignmentBand);
  multi("confidence", query.confidence);
  multi("freshness", query.freshness);
  multi("assessmentCompleteness", query.assessmentCompleteness);
  multi("publicationEligibility", query.publicationEligibility);
  multi("opportunityContext", query.opportunityContext);
  multi("capabilityId", query.capabilityId);
  multi("capabilityAssessmentStatus", query.capabilityAssessmentStatus);
  if (query.verticalFilters) {
    for (const [key, values] of Object.entries(query.verticalFilters)) {
      if (Array.isArray(values)) multi(key, values);
    }
  }
  if (query.exclusionPolicy !== "hide_excluded") {
    params.set("exclusionPolicy", query.exclusionPolicy);
  }
  if (query.sort !== "observed_alignment_desc") params.set("sort", query.sort);
  if (query.page !== 1) params.set("page", String(query.page));
  if (query.pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(query.pageSize));
  return params;
}

export function defaultExplorerQuery(): ExplorerQuery {
  return ExplorerQuerySchema.parse({});
}

export const EXPLORER_SORT_LABELS: Record<ExplorerSort, string> = {
  observed_alignment_desc: "Observed alignment (highest first)",
  observed_alignment_asc: "Observed alignment (lowest first)",
  name_asc: "Name (A–Z)",
  name_desc: "Name (Z–A)",
  confidence_desc: "Confidence (highest first)",
  freshness_desc: "Freshness (most current first)",
  assessment_coverage_desc: "Assessment coverage (highest first)",
  organization_type_asc: "Organization type (A–Z)",
};
