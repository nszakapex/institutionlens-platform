import { z } from "zod";
import {
  ConfidenceLevelSchema,
  FreshnessStatusSchema,
  PublicationEligibilitySchema,
} from "@/domain/schemas/assessment";
import {
  EpistemicStatusSchema,
  EvidenceTypeSchema,
  type EvidenceType,
} from "@/domain/schemas/evidence";
import { OrganizationPublicRefSchema } from "@/domain/organization-public-ref";
import { RuleOutcomeSchema } from "@/domain/assessments/ledger";
import {
  AccessClassificationSchema,
  LicenseStatusSchema,
  SourceTypeSchema,
  ValidationStatusSchema,
} from "@/domain/schemas/provenance";
import { normalizeSearchText } from "@/domain/schemas/query";
import { MAX_MULTI_SELECT, normalizeMultiValues } from "@/application/explorer-query";

export const EVIDENCE_CATALOG_PAGE_SIZES = [20, 40] as const;
export type EvidenceCatalogPageSize = (typeof EVIDENCE_CATALOG_PAGE_SIZES)[number];

export const EvidenceCatalogViewSchema = z.enum(["evidence", "provenance"]);
export type EvidenceCatalogView = z.infer<typeof EvidenceCatalogViewSchema>;
export const EvidenceCapabilitySchema = z.enum([
  "operational-analytics-support",
  "data-quality-modernization",
  "portfolio-reporting-workflow",
  "scenario-planning-support",
  "governance-process-review",
]);
export const PeriodCategorySchema = z.enum(["known_period", "unknown_period"]);

export const EvidenceCatalogQuerySchema = z
  .object({
    view: EvidenceCatalogViewSchema.default("evidence"),
    text: z.string().max(100).optional(),
    evidenceType: z.array(EvidenceTypeSchema).max(MAX_MULTI_SELECT).optional(),
    epistemicStatus: z.array(EpistemicStatusSchema).max(MAX_MULTI_SELECT).optional(),
    freshness: z.array(FreshnessStatusSchema).max(MAX_MULTI_SELECT).optional(),
    confidence: z.array(ConfidenceLevelSchema).max(MAX_MULTI_SELECT).optional(),
    publicationEligibility: z.array(PublicationEligibilitySchema).max(MAX_MULTI_SELECT).optional(),
    capability: z.array(EvidenceCapabilitySchema).max(MAX_MULTI_SELECT).optional(),
    ruleOutcome: z.array(RuleOutcomeSchema).max(MAX_MULTI_SELECT).optional(),
    periodCategory: z.array(PeriodCategorySchema).max(MAX_MULTI_SELECT).optional(),
    sourceType: z.array(SourceTypeSchema).max(MAX_MULTI_SELECT).optional(),
    validationStatus: z.array(ValidationStatusSchema).max(MAX_MULTI_SELECT).optional(),
    licenseStatus: z.array(LicenseStatusSchema).max(MAX_MULTI_SELECT).optional(),
    accessClassification: z.array(AccessClassificationSchema).max(MAX_MULTI_SELECT).optional(),
    reportingPeriod: z.array(PeriodCategorySchema).max(MAX_MULTI_SELECT).optional(),
    syntheticStatus: z.array(z.literal("synthetic")).max(1).optional(),
    orgRef: OrganizationPublicRefSchema.optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z
      .number()
      .int()
      .refine(
        (n): n is EvidenceCatalogPageSize =>
          (EVIDENCE_CATALOG_PAGE_SIZES as readonly number[]).includes(n),
        { message: "pageSize must be 20 or 40" },
      )
      .default(20),
  })
  .strict();

export type EvidenceCatalogQueryInput = z.input<typeof EvidenceCatalogQuerySchema>;
export type EvidenceCatalogQuery = z.output<typeof EvidenceCatalogQuerySchema>;

export type EvidenceCatalogQueryParseResult =
  | { ok: true; query: EvidenceCatalogQuery; unknownParams: readonly string[] }
  | {
      ok: false;
      errorSummary: string;
      issues: readonly string[];
      unknownParams: readonly string[];
      defaults: EvidenceCatalogQuery;
    };

const KNOWN_PARAM_KEYS = new Set([
  "view",
  "q",
  "text",
  "evidenceType",
  "epistemicStatus",
  "freshness",
  "confidence",
  "publicationEligibility",
  "capability",
  "ruleOutcome",
  "periodCategory",
  "sourceType",
  "validationStatus",
  "licenseStatus",
  "accessClassification",
  "reportingPeriod",
  "syntheticStatus",
  "orgRef",
  "page",
  "pageSize",
]);

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

export function parseEvidenceCatalogSearchParams(
  params: Record<string, string | string[] | undefined>,
): EvidenceCatalogQueryParseResult {
  const unknownParams = Object.keys(params).filter((key) => !KNOWN_PARAM_KEYS.has(key));
  const defaults = EvidenceCatalogQuerySchema.parse({});
  const text = normalizeSearchText(asSingle(params.q) ?? asSingle(params.text));

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
    ["evidenceType", params.evidenceType],
    ["epistemicStatus", params.epistemicStatus],
    ["freshness", params.freshness],
    ["confidence", params.confidence],
    ["publicationEligibility", params.publicationEligibility],
    ["capability", params.capability],
    ["ruleOutcome", params.ruleOutcome],
    ["periodCategory", params.periodCategory],
    ["sourceType", params.sourceType],
    ["validationStatus", params.validationStatus],
    ["licenseStatus", params.licenseStatus],
    ["accessClassification", params.accessClassification],
    ["reportingPeriod", params.reportingPeriod],
    ["syntheticStatus", params.syntheticStatus],
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

  const page = parsePositiveInt(asSingle(params.page), 1);
  const pageSizeRaw = asSingle(params.pageSize);
  const pageSize = pageSizeRaw === undefined ? 20 : parsePositiveInt(pageSizeRaw, Number.NaN);
  if (!Number.isInteger(page) || page < 1) {
    return {
      ok: false,
      errorSummary: "Page must be an integer greater than or equal to 1.",
      issues: ["invalid_page"],
      unknownParams,
      defaults,
    };
  }
  if (
    pageSizeRaw !== undefined &&
    (!Number.isInteger(pageSize) ||
      !(EVIDENCE_CATALOG_PAGE_SIZES as readonly number[]).includes(pageSize))
  ) {
    return {
      ok: false,
      errorSummary: "Page size must be 20 or 40 (maximum 50).",
      issues: ["invalid_page_size"],
      unknownParams,
      defaults,
    };
  }

  const candidate: EvidenceCatalogQueryInput = {
    view: (asSingle(params.view) ?? "evidence") as EvidenceCatalogView,
    ...(text !== undefined ? { text } : {}),
    evidenceType: normalizedMultis.evidenceType as EvidenceType[] | undefined,
    epistemicStatus:
      normalizedMultis.epistemicStatus as EvidenceCatalogQueryInput["epistemicStatus"],
    freshness: normalizedMultis.freshness as EvidenceCatalogQueryInput["freshness"],
    confidence: normalizedMultis.confidence as EvidenceCatalogQueryInput["confidence"],
    publicationEligibility:
      normalizedMultis.publicationEligibility as EvidenceCatalogQueryInput["publicationEligibility"],
    capability: normalizedMultis.capability as EvidenceCatalogQueryInput["capability"],
    ruleOutcome: normalizedMultis.ruleOutcome as EvidenceCatalogQueryInput["ruleOutcome"],
    periodCategory: normalizedMultis.periodCategory as EvidenceCatalogQueryInput["periodCategory"],
    sourceType: normalizedMultis.sourceType as EvidenceCatalogQueryInput["sourceType"],
    validationStatus:
      normalizedMultis.validationStatus as EvidenceCatalogQueryInput["validationStatus"],
    licenseStatus: normalizedMultis.licenseStatus as EvidenceCatalogQueryInput["licenseStatus"],
    accessClassification:
      normalizedMultis.accessClassification as EvidenceCatalogQueryInput["accessClassification"],
    reportingPeriod:
      normalizedMultis.reportingPeriod as EvidenceCatalogQueryInput["reportingPeriod"],
    syntheticStatus:
      normalizedMultis.syntheticStatus as EvidenceCatalogQueryInput["syntheticStatus"],
    orgRef: asSingle(params.orgRef),
    page,
    pageSize: pageSize as EvidenceCatalogPageSize,
  };

  const parsed = EvidenceCatalogQuerySchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      errorSummary: "One or more evidence filters are invalid or unsupported.",
      issues: parsed.error.issues.map((issue) => issue.path.join(".") || issue.code),
      unknownParams,
      defaults,
    };
  }

  return { ok: true, query: parsed.data, unknownParams };
}

export function evidenceCatalogQueryToSearchParams(query: EvidenceCatalogQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.view !== "evidence") params.set("view", query.view);
  if (query.text) params.set("q", query.text);
  const multi = (key: string, values: readonly string[] | undefined) => {
    if (!values) return;
    for (const value of values) params.append(key, value);
  };
  multi("evidenceType", query.evidenceType);
  multi("epistemicStatus", query.epistemicStatus);
  multi("freshness", query.freshness);
  multi("confidence", query.confidence);
  multi("publicationEligibility", query.publicationEligibility);
  multi("capability", query.capability);
  multi("ruleOutcome", query.ruleOutcome);
  multi("periodCategory", query.periodCategory);
  multi("sourceType", query.sourceType);
  multi("validationStatus", query.validationStatus);
  multi("licenseStatus", query.licenseStatus);
  multi("accessClassification", query.accessClassification);
  multi("reportingPeriod", query.reportingPeriod);
  multi("syntheticStatus", query.syntheticStatus);
  if (query.orgRef) params.set("orgRef", query.orgRef);
  if (query.page !== 1) params.set("page", String(query.page));
  if (query.pageSize !== 20) params.set("pageSize", String(query.pageSize));
  return params;
}
