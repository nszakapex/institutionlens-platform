import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { AuthorizationError } from "@/domain/errors";
import { ASSESSMENT_HEURISTIC_DISCLAIMER } from "@/application/assessment-view-models";
import {
  EXPLORER_SORT_LABELS,
  capabilityQueryValueFor,
  defaultExplorerQuery,
  explorerQueryToSearchParams,
  parseExplorerSearchParams,
  type ExplorerQuery,
  type ExplorerSort,
} from "@/application/explorer-query";
import type {
  ActiveFilterChipView,
  ExplorerFacetsView,
  ExplorerPageView,
  ExplorerResultRowView,
} from "@/application/explorer-view-models";
import {
  compareDisplayName,
  compareStableId,
  confidenceRank,
  freshnessRank,
} from "@/application/prioritization-policy";
import {
  bandLabel,
  conditionalDisclosure,
  getTenantResearchReadModel,
  insufficientReasonCodes,
  isCompatibleAdapter,
  reasonSummaryFromCodes,
  scoreCoverageRatio,
  type OrgResearchRecord,
  type TenantResearchReadModel,
} from "@/application/research-read-model";
import {
  ComplexityBandSchema,
  BreadthBandSchema,
  DataAvailabilitySchema,
  InstitutionKindSchema,
  MaturityBandSchema,
  OperatingRegionSchema,
  OwnershipModelSchema,
  ScaleBandSchema,
  ServiceAreaTypeSchema,
} from "@/verticals/financial-institutions/schema";
import { FINANCIAL_INSTITUTIONS_VOCABULARY } from "@/verticals/financial-institutions/vocabulary";
import { ObservedFitBandSchema } from "@/domain/schemas/assessment";
import { OpportunityContextStatusSchema } from "@/domain/assessments/results";

function vocab(value: string): string {
  const map = FINANCIAL_INSTITUTIONS_VOCABULARY as Record<string, string>;
  return map[value] ?? value.replace(/_/g, " ");
}

function matchesText(org: OrgResearchRecord, text: string | undefined): boolean {
  if (!text) return true;
  return org.searchHaystack.includes(text.toLowerCase());
}

function matchesMulti(value: string, allowed: readonly string[] | undefined): boolean {
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(value);
}

function matchesVerticalFilters(
  org: OrgResearchRecord,
  filters: Record<string, unknown> | undefined,
): boolean {
  if (!filters || Object.keys(filters).length === 0) return true;
  const payload = org.payload;

  const list = (value: unknown): string[] | undefined => {
    if (value === undefined) return undefined;
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
    if (typeof value === "string") return [value];
    return undefined;
  };

  const kind = list(filters.institutionKind);
  if (kind && kind.length > 0 && !kind.includes(payload.institutionKind)) return false;

  const scale = list(filters.scaleBand);
  if (scale && scale.length > 0 && !scale.includes(payload.balanceSheetScaleBand)) return false;

  const region = list(filters.operatingRegion);
  if (region && region.length > 0) {
    const hit = region.some((code) => payload.operatingRegions.includes(code as never));
    if (!hit) return false;
  }

  const availability = list(filters.dataAvailability);
  if (
    availability &&
    availability.length > 0 &&
    !availability.includes(payload.regulatoryDataAvailability)
  ) {
    return false;
  }

  const serviceArea = list(filters.serviceAreaType);
  if (serviceArea && serviceArea.length > 0 && !serviceArea.includes(payload.serviceAreaType)) {
    return false;
  }

  const ownership = list(filters.ownershipModel);
  if (ownership && ownership.length > 0 && !ownership.includes(payload.ownershipModel)) {
    return false;
  }

  const complexity = list(filters.operatingComplexityBand);
  if (
    complexity &&
    complexity.length > 0 &&
    !complexity.includes(payload.operatingComplexityBand)
  ) {
    return false;
  }

  const maturity = list(filters.digitalServiceMaturity);
  if (maturity && maturity.length > 0 && !maturity.includes(payload.digitalServiceMaturity)) {
    return false;
  }

  const breadth = list(filters.lendingBreadth);
  if (breadth && breadth.length > 0 && !breadth.includes(payload.lendingBreadth)) return false;

  return true;
}

function filterOrganizations(
  model: TenantResearchReadModel,
  query: ExplorerQuery,
): OrgResearchRecord[] {
  return model.organizations.filter((org) => {
    if (!isCompatibleAdapter(org)) return false;
    if (query.exclusionPolicy === "hide_excluded" && org.excluded) return false;
    if (!matchesText(org, query.text)) return false;
    if (!matchesMulti(org.organizationType, query.organizationType)) return false;
    if (!matchesMulti(org.lifecycleStatus, query.lifecycleStatus)) return false;
    if (query.tags && query.tags.length > 0) {
      const hit = query.tags.some((tag) => org.tags.includes(tag));
      if (!hit) return false;
    }
    if (!matchesMulti(org.portfolio.status, query.assessmentStatus)) return false;
    if (query.observedAlignmentBand && query.observedAlignmentBand.length > 0) {
      if (org.portfolio.status !== "assessed" || !org.portfolio.portfolioPriorityScore) {
        return false;
      }
      if (!query.observedAlignmentBand.includes(org.portfolio.portfolioPriorityScore.band)) {
        return false;
      }
    }
    if (!matchesMulti(org.portfolio.confidence, query.confidence)) return false;
    if (!matchesMulti(org.portfolio.freshness, query.freshness)) return false;
    if (!matchesMulti(org.portfolio.completeness, query.assessmentCompleteness)) return false;
    if (!matchesMulti(org.portfolio.publicationEligibility, query.publicationEligibility)) {
      return false;
    }
    if (!matchesMulti(org.opportunityContextStatus, query.opportunityContext)) return false;
    if (query.capabilityId && query.capabilityId.length > 0) {
      const hit = org.capabilityAssessments.some((a) =>
        query.capabilityId!.includes(a.capabilityId),
      );
      if (!hit) return false;
    }
    if (query.capabilityAssessmentStatus && query.capabilityAssessmentStatus.length > 0) {
      const hit = org.capabilityAssessments.some((a) =>
        query.capabilityAssessmentStatus!.includes(a.fit.status as never),
      );
      if (!hit) return false;
      if (query.capabilityId && query.capabilityId.length > 0) {
        const scoped = org.capabilityAssessments.some(
          (a) =>
            query.capabilityId!.includes(a.capabilityId) &&
            query.capabilityAssessmentStatus!.includes(a.fit.status as never),
        );
        if (!scoped) return false;
      }
    }
    if (!matchesVerticalFilters(org, query.verticalFilters)) return false;
    return true;
  });
}

function scoreRatio(org: OrgResearchRecord): number {
  const score = org.portfolio.portfolioPriorityScore;
  if (!score || score.pointsPossible <= 0) return -1;
  return score.pointsAwarded / score.pointsPossible;
}

function isScoreSort(sort: ExplorerSort): boolean {
  return sort === "observed_alignment_desc" || sort === "observed_alignment_asc";
}

function compareBySort(a: OrgResearchRecord, b: OrgResearchRecord, sort: ExplorerSort): number {
  switch (sort) {
    case "observed_alignment_desc": {
      const diff = scoreRatio(b) - scoreRatio(a);
      if (diff !== 0) return diff;
      break;
    }
    case "observed_alignment_asc": {
      const diff = scoreRatio(a) - scoreRatio(b);
      if (diff !== 0) return diff;
      break;
    }
    case "name_asc":
      return (
        compareDisplayName(a.displayName, b.displayName) ||
        compareStableId(a.organizationId, b.organizationId)
      );
    case "name_desc":
      return (
        compareDisplayName(b.displayName, a.displayName) ||
        compareStableId(a.organizationId, b.organizationId)
      );
    case "confidence_desc": {
      const diff = confidenceRank(a.portfolio.confidence) - confidenceRank(b.portfolio.confidence);
      if (diff !== 0) return diff;
      break;
    }
    case "freshness_desc": {
      const diff = freshnessRank(a.portfolio.freshness) - freshnessRank(b.portfolio.freshness);
      if (diff !== 0) return diff;
      break;
    }
    case "assessment_coverage_desc": {
      const diff = scoreCoverageRatio(b) - scoreCoverageRatio(a);
      if (diff !== 0) return diff;
      break;
    }
    case "organization_type_asc": {
      const type = compareDisplayName(a.organizationType, b.organizationType);
      if (type !== 0) return type;
      break;
    }
  }
  return (
    compareDisplayName(a.displayName, b.displayName) ||
    compareStableId(a.organizationId, b.organizationId)
  );
}

function sortOrganizations(
  items: OrgResearchRecord[],
  sort: ExplorerSort,
): {
  assessed: OrgResearchRecord[];
  insufficient: OrgResearchRecord[];
  combined: OrgResearchRecord[];
} {
  if (isScoreSort(sort)) {
    const assessed = items
      .filter((o) => o.portfolio.status === "assessed" && o.portfolio.portfolioPriorityScore)
      .sort((a, b) => compareBySort(a, b, sort));
    const insufficient = items
      .filter((o) => o.portfolio.status !== "assessed" || !o.portfolio.portfolioPriorityScore)
      .sort(
        (a, b) =>
          compareDisplayName(a.displayName, b.displayName) ||
          compareStableId(a.organizationId, b.organizationId),
      );
    return { assessed, insufficient, combined: [...assessed, ...insufficient] };
  }
  const combined = [...items].sort((a, b) => compareBySort(a, b, sort));
  return { assessed: [], insufficient: [], combined };
}

function toResultRow(org: OrgResearchRecord): ExplorerResultRowView {
  const warnings: string[] = [];
  if (org.portfolio.status === "insufficient_evidence") {
    warnings.push(reasonSummaryFromCodes(insufficientReasonCodes(org)));
  }
  if (org.portfolio.freshness === "stale") warnings.push("Stale supporting evidence");
  if (org.portfolio.confidence === "low") warnings.push("Low confidence");
  if (org.excluded) warnings.push("Explicitly excluded (synthetic overlay)");

  const base = {
    displayName: org.displayName,
    detailHref: `/organizations/${org.publicRef}`,
    organizationType: org.organizationType,
    verticalSummary: org.verticalSummary,
    portfolioAssessmentStatus:
      org.portfolio.status === "insufficient_evidence"
        ? "Insufficient evidence"
        : org.portfolio.status === "assessed"
          ? "Assessed"
          : org.portfolio.status,
    assessedCapabilityCount: org.portfolio.coverage.assessedCapabilityCount,
    enabledCapabilityCount: org.portfolio.coverage.enabledCapabilityCount,
    assessedPriorityWeight: org.portfolio.coverage.assessedPriorityWeight,
    enabledPriorityWeight: org.portfolio.coverage.enabledPriorityWeight,
    confidence: org.portfolio.confidence,
    freshness: org.portfolio.freshness,
    assessmentCompleteness: org.portfolio.completeness,
    publicationEligibility: org.portfolio.publicationEligibility,
    opportunityContextStatus: org.opportunityContextStatus,
    opportunityContextLabel: org.opportunityContextLabel,
    warnings: Object.freeze(warnings),
    synthetic: true as const,
  };

  if (org.portfolio.status === "assessed" && org.portfolio.portfolioPriorityScore) {
    const score = org.portfolio.portfolioPriorityScore;
    return {
      ...base,
      conditionalScore: {
        pointsAwarded: score.pointsAwarded,
        pointsPossible: score.pointsPossible,
        disclosure: conditionalDisclosure(org),
      },
      bandLabel: bandLabel(score.band),
    };
  }

  return base;
}

function hrefFor(query: ExplorerQuery, overrides: Partial<ExplorerQuery> = {}): string {
  const next = { ...query, ...overrides };
  const params = explorerQueryToSearchParams(next);
  const qs = params.toString();
  return qs ? `/organizations?${qs}` : "/organizations";
}

function buildActiveFilters(query: ExplorerQuery): ActiveFilterChipView[] {
  const chips: ActiveFilterChipView[] = [];

  const add = (key: string, label: string, cleared: Partial<ExplorerQuery>) => {
    chips.push({
      key,
      label,
      removeHref: hrefFor({ ...query, page: 1, ...cleared }),
    });
  };

  if (query.text) add("text", `Search: ${query.text}`, { text: undefined });
  if (query.organizationType) {
    for (const value of query.organizationType) {
      add(`organizationType:${value}`, `Type: ${value}`, {
        organizationType: query.organizationType.filter((v) => v !== value),
      });
    }
  }
  if (query.lifecycleStatus) {
    for (const value of query.lifecycleStatus) {
      add(`lifecycle:${value}`, `Lifecycle: ${value}`, {
        lifecycleStatus: query.lifecycleStatus.filter((v) => v !== value),
      });
    }
  }
  if (query.tags) {
    for (const value of query.tags) {
      add(`tag:${value}`, `Tag: ${value}`, { tags: query.tags.filter((v) => v !== value) });
    }
  }
  if (query.assessmentStatus) {
    for (const value of query.assessmentStatus) {
      add(`assessment:${value}`, `Assessment: ${value.replace(/_/g, " ")}`, {
        assessmentStatus: query.assessmentStatus.filter((v) => v !== value),
      });
    }
  }
  if (query.observedAlignmentBand) {
    for (const value of query.observedAlignmentBand) {
      add(`band:${value}`, `Alignment: ${bandLabel(value)}`, {
        observedAlignmentBand: query.observedAlignmentBand.filter((v) => v !== value),
      });
    }
  }
  if (query.confidence) {
    for (const value of query.confidence) {
      add(`confidence:${value}`, `Confidence: ${value}`, {
        confidence: query.confidence.filter((v) => v !== value),
      });
    }
  }
  if (query.freshness) {
    for (const value of query.freshness) {
      add(`freshness:${value}`, `Freshness: ${value}`, {
        freshness: query.freshness.filter((v) => v !== value),
      });
    }
  }
  if (query.assessmentCompleteness) {
    for (const value of query.assessmentCompleteness) {
      add(`completeness:${value}`, `Completeness: ${value}`, {
        assessmentCompleteness: query.assessmentCompleteness.filter((v) => v !== value),
      });
    }
  }
  if (query.publicationEligibility) {
    for (const value of query.publicationEligibility) {
      add(`publication:${value}`, `Publication: ${value.replace(/_/g, " ")}`, {
        publicationEligibility: query.publicationEligibility.filter((v) => v !== value),
      });
    }
  }
  if (query.opportunityContext) {
    for (const value of query.opportunityContext) {
      add(`opportunity:${value}`, `Opportunity: ${value.replace(/_/g, " ")}`, {
        opportunityContext: query.opportunityContext.filter((v) => v !== value),
      });
    }
  }
  if (query.capabilityId) {
    for (const value of query.capabilityId) {
      add(`capability:${capabilityQueryValueFor(value)}`, `Capability filter`, {
        capabilityId: query.capabilityId.filter((v) => v !== value),
      });
    }
  }
  if (query.capabilityAssessmentStatus) {
    for (const value of query.capabilityAssessmentStatus) {
      add(`capStatus:${value}`, `Capability status: ${value.replace(/_/g, " ")}`, {
        capabilityAssessmentStatus: query.capabilityAssessmentStatus.filter((v) => v !== value),
      });
    }
  }
  if (query.verticalFilters) {
    const keys = Object.keys(query.verticalFilters) as Array<keyof typeof query.verticalFilters>;
    for (const key of keys) {
      const values = query.verticalFilters[key];
      if (!Array.isArray(values)) continue;
      for (const value of values) {
        if (typeof value !== "string") continue;
        const nextFilters = { ...query.verticalFilters };
        const remaining = values.filter((item) => item !== value);
        if (remaining.length > 0) {
          nextFilters[key] = remaining as never;
        } else {
          delete nextFilters[key];
        }
        add(`vf:${key}:${value}`, `${vocab(String(key))}: ${vocab(value)}`, {
          verticalFilters: Object.keys(nextFilters).length > 0 ? nextFilters : undefined,
        });
      }
    }
  }

  // Default exclusion policy is always visible
  if (query.exclusionPolicy === "hide_excluded") {
    chips.unshift({
      key: "exclusionPolicy",
      label: "Excluded hidden (default)",
      removeHref: hrefFor(query, { exclusionPolicy: "include_excluded", page: 1 }),
    });
  } else {
    chips.unshift({
      key: "exclusionPolicy",
      label: "Excluded included",
      removeHref: hrefFor(query, { exclusionPolicy: "hide_excluded", page: 1 }),
    });
  }

  return chips;
}

function buildFacets(model: TenantResearchReadModel): ExplorerFacetsView {
  const types = new Set<string>();
  const lifecycles = new Set<string>();
  const tags = new Set<string>();
  for (const org of model.organizations) {
    types.add(org.organizationType);
    lifecycles.add(org.lifecycleStatus);
    for (const tag of org.tags) tags.add(tag);
  }

  const opt = (values: readonly string[]) =>
    Object.freeze(values.map((value) => ({ value, label: vocab(value) })));

  return {
    organizationTypes: opt([...types].sort()),
    lifecycleStatuses: opt([...lifecycles].sort()),
    tags: opt([...tags].sort()),
    assessmentStatuses: opt(["assessed", "insufficient_evidence"]),
    observedAlignmentBands: opt(ObservedFitBandSchema.options),
    confidenceLevels: opt(["high", "moderate", "low", "unknown"]),
    freshnessStatuses: opt(["current", "aging", "stale", "unknown"]),
    assessmentCompleteness: opt(["sufficient", "partial", "insufficient", "unknown"]),
    publicationEligibility: opt(["eligible", "internal_only", "review_required", "restricted"]),
    opportunityContexts: opt(OpportunityContextStatusSchema.options),
    capabilities: Object.freeze(
      model.capabilityCatalog.map((c) => ({
        value: capabilityQueryValueFor(c.capabilityId),
        label: c.name,
      })),
    ),
    verticalFilters: {
      institutionKind: {
        label: "Institution kind",
        options: opt(InstitutionKindSchema.options),
      },
      scaleBand: { label: "Scale band", options: opt(ScaleBandSchema.options) },
      operatingRegion: {
        label: "Operating region",
        options: opt(OperatingRegionSchema.options),
      },
      dataAvailability: {
        label: "Data availability",
        options: opt(DataAvailabilitySchema.options),
      },
      serviceAreaType: {
        label: "Service-area type",
        options: opt(ServiceAreaTypeSchema.options),
      },
      ownershipModel: {
        label: "Ownership model",
        options: opt(OwnershipModelSchema.options),
      },
      operatingComplexityBand: {
        label: "Operating-complexity band",
        options: opt(ComplexityBandSchema.options),
      },
      digitalServiceMaturity: {
        label: "Digital-service maturity",
        options: opt(MaturityBandSchema.options),
      },
      lendingBreadth: {
        label: "Lending-breadth category",
        options: opt(BreadthBandSchema.options),
      },
    },
  };
}

function pageWindow(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
}

function formValuesFromQuery(query: ExplorerQuery): ExplorerPageView["formValues"] {
  const vf = query.verticalFilters ?? {};
  const list = (value: unknown): readonly string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  return {
    text: query.text ?? "",
    organizationType: query.organizationType ?? [],
    assessmentStatus: query.assessmentStatus ?? [],
    observedAlignmentBand: query.observedAlignmentBand ?? [],
    confidence: query.confidence ?? [],
    freshness: query.freshness ?? [],
    assessmentCompleteness: query.assessmentCompleteness ?? [],
    publicationEligibility: query.publicationEligibility ?? [],
    opportunityContext: query.opportunityContext ?? [],
    capabilityId: query.capabilityId?.map(capabilityQueryValueFor) ?? [],
    capabilityAssessmentStatus: query.capabilityAssessmentStatus ?? [],
    institutionKind: list(vf.institutionKind),
    scaleBand: list(vf.scaleBand),
    operatingRegion: list(vf.operatingRegion),
    dataAvailability: list(vf.dataAvailability),
    serviceAreaType: list(vf.serviceAreaType),
    ownershipModel: list(vf.ownershipModel),
    operatingComplexityBand: list(vf.operatingComplexityBand),
    digitalServiceMaturity: list(vf.digitalServiceMaturity),
    lendingBreadth: list(vf.lendingBreadth),
    exclusionPolicy: query.exclusionPolicy,
    sort: query.sort,
    pageSize: query.pageSize,
  };
}

function emptyFormValues(): ExplorerPageView["formValues"] {
  return formValuesFromQuery(defaultExplorerQuery());
}

function sortExplanation(sort: ExplorerSort): string {
  if (isScoreSort(sort)) {
    return `${EXPLORER_SORT_LABELS[sort]}. Assessed organizations appear first. Insufficient-evidence organizations follow without fabricated scores.`;
  }
  return EXPLORER_SORT_LABELS[sort];
}

/**
 * Build the organization explorer view from URL search params.
 */
export async function buildExplorerPageView(
  context: AuthorizationContext,
  searchParams: Record<string, string | string[] | undefined>,
): Promise<ExplorerPageView> {
  const parsed = parseExplorerSearchParams(searchParams);
  const defaults = defaultExplorerQuery();

  try {
    const model = getTenantResearchReadModel(context);
    const facets = buildFacets(model);

    if (!parsed.ok) {
      return {
        verticalLabel: model.verticalLabel,
        syntheticNotice: model.syntheticNotice,
        heuristicDisclaimer: ASSESSMENT_HEURISTIC_DISCLAIMER,
        queryValid: false,
        errorSummary: parsed.errorSummary,
        unknownParams: parsed.unknownParams,
        formValues: emptyFormValues(),
        activeFilters: [],
        clearAllHref: "/organizations",
        sort: defaults.sort,
        sortLabel: EXPLORER_SORT_LABELS[defaults.sort],
        sortExplanation: sortExplanation(defaults.sort),
        page: 1,
        pageSize: defaults.pageSize,
        totalCount: 0,
        totalPages: 0,
        resultCountAnnouncement: "Query could not be applied.",
        assessedSection: [],
        insufficientSection: [],
        combinedRows: [],
        useAssessedInsufficientSplit: false,
        pagination: {
          previousHref: null,
          nextHref: null,
          pageHrefs: [],
          beyondRange: false,
          recoveryHref: "/organizations",
        },
        facets,
        state: "malformed_query",
        stateMessage: parsed.errorSummary,
      };
    }

    const query = parsed.query;

    if (model.organizations.length === 0) {
      return {
        verticalLabel: model.verticalLabel,
        syntheticNotice: model.syntheticNotice,
        heuristicDisclaimer: ASSESSMENT_HEURISTIC_DISCLAIMER,
        queryValid: true,
        unknownParams: parsed.unknownParams,
        formValues: formValuesFromQuery(query),
        activeFilters: buildActiveFilters(query),
        clearAllHref: "/organizations",
        sort: query.sort,
        sortLabel: EXPLORER_SORT_LABELS[query.sort],
        sortExplanation: sortExplanation(query.sort),
        page: query.page,
        pageSize: query.pageSize,
        totalCount: 0,
        totalPages: 0,
        resultCountAnnouncement: "No organizations in this tenant.",
        assessedSection: [],
        insufficientSection: [],
        combinedRows: [],
        useAssessedInsufficientSplit: false,
        pagination: {
          previousHref: null,
          nextHref: null,
          pageHrefs: [],
          beyondRange: false,
          recoveryHref: null,
        },
        facets,
        state: "empty_tenant",
        stateMessage: "No organizations are available in this tenant.",
      };
    }

    const filtered = filterOrganizations(model, query);
    const sorted = sortOrganizations(filtered, query.sort);
    const totalCount = sorted.combined.length;
    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / query.pageSize);
    const beyondRange = totalPages > 0 && query.page > totalPages;

    if (beyondRange) {
      return {
        verticalLabel: model.verticalLabel,
        syntheticNotice: model.syntheticNotice,
        heuristicDisclaimer: ASSESSMENT_HEURISTIC_DISCLAIMER,
        queryValid: true,
        unknownParams: parsed.unknownParams,
        formValues: formValuesFromQuery(query),
        activeFilters: buildActiveFilters(query),
        clearAllHref: "/organizations",
        sort: query.sort,
        sortLabel: EXPLORER_SORT_LABELS[query.sort],
        sortExplanation: sortExplanation(query.sort),
        page: query.page,
        pageSize: query.pageSize,
        totalCount,
        totalPages,
        resultCountAnnouncement: `Page ${query.page} is beyond the available results.`,
        assessedSection: [],
        insufficientSection: [],
        combinedRows: [],
        useAssessedInsufficientSplit: isScoreSort(query.sort),
        pagination: {
          previousHref: null,
          nextHref: null,
          pageHrefs: [],
          beyondRange: true,
          recoveryHref: hrefFor(query, { page: totalPages }),
        },
        facets,
        state: "beyond_range",
        stateMessage: `Page ${query.page} does not exist. Return to the last page.`,
      };
    }

    const start = (query.page - 1) * query.pageSize;
    const pageItems = sorted.combined.slice(start, start + query.pageSize);
    const useSplit = isScoreSort(query.sort);
    const assessedSection = useSplit
      ? pageItems.filter((o) => o.portfolio.status === "assessed").map(toResultRow)
      : [];
    const insufficientSection = useSplit
      ? pageItems.filter((o) => o.portfolio.status !== "assessed").map(toResultRow)
      : [];
    const combinedRows = pageItems.map(toResultRow);

    let state: ExplorerPageView["state"] = "ready";
    let stateMessage: string | undefined;
    if (totalCount === 0) {
      state = query.text ? "no_search_results" : "no_results";
      stateMessage = query.text
        ? "No organizations match this search and filter combination."
        : "No organizations match the active filters.";
    }

    const pageHrefs = pageWindow(query.page, totalPages).map((page) => ({
      page,
      href: hrefFor(query, { page }),
      current: page === query.page,
    }));

    return {
      verticalLabel: model.verticalLabel,
      syntheticNotice: model.syntheticNotice,
      heuristicDisclaimer: ASSESSMENT_HEURISTIC_DISCLAIMER,
      queryValid: true,
      unknownParams: parsed.unknownParams,
      formValues: formValuesFromQuery(query),
      activeFilters: buildActiveFilters(query),
      clearAllHref: "/organizations",
      sort: query.sort,
      sortLabel: EXPLORER_SORT_LABELS[query.sort],
      sortExplanation: sortExplanation(query.sort),
      page: query.page,
      pageSize: query.pageSize,
      totalCount,
      totalPages,
      resultCountAnnouncement: `${totalCount} organization${totalCount === 1 ? "" : "s"}`,
      assessedSection: Object.freeze(assessedSection),
      insufficientSection: Object.freeze(insufficientSection),
      combinedRows: Object.freeze(combinedRows),
      useAssessedInsufficientSplit: useSplit,
      pagination: {
        previousHref: query.page > 1 ? hrefFor(query, { page: query.page - 1 }) : null,
        nextHref: query.page < totalPages ? hrefFor(query, { page: query.page + 1 }) : null,
        pageHrefs: Object.freeze(pageHrefs),
        beyondRange: false,
        recoveryHref: null,
      },
      facets,
      state,
      ...(stateMessage ? { stateMessage } : {}),
    };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return {
        verticalLabel: "Financial institutions",
        syntheticNotice: "Synthetic demo dataset unavailable for this authorization context.",
        heuristicDisclaimer: ASSESSMENT_HEURISTIC_DISCLAIMER,
        queryValid: false,
        errorSummary: "This workspace cannot load the organization explorer.",
        unknownParams: [],
        formValues: emptyFormValues(),
        activeFilters: [],
        clearAllHref: "/organizations",
        sort: defaults.sort,
        sortLabel: EXPLORER_SORT_LABELS[defaults.sort],
        sortExplanation: sortExplanation(defaults.sort),
        page: 1,
        pageSize: defaults.pageSize,
        totalCount: 0,
        totalPages: 0,
        resultCountAnnouncement: "Unavailable",
        assessedSection: [],
        insufficientSection: [],
        combinedRows: [],
        useAssessedInsufficientSplit: false,
        pagination: {
          previousHref: null,
          nextHref: null,
          pageHrefs: [],
          beyondRange: false,
          recoveryHref: null,
        },
        facets: {
          organizationTypes: [],
          lifecycleStatuses: [],
          tags: [],
          assessmentStatuses: [],
          observedAlignmentBands: [],
          confidenceLevels: [],
          freshnessStatuses: [],
          assessmentCompleteness: [],
          publicationEligibility: [],
          opportunityContexts: [],
          capabilities: [],
          verticalFilters: {},
        },
        state: "unauthorized",
        stateMessage: "This workspace cannot load the organization explorer.",
      };
    }
    throw error;
  }
}
