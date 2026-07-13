import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { assertPermission } from "@/authorization/context";
import { roleHasPermission } from "@/authorization/policy";
import { AuthorizationError } from "@/domain/errors";
import type { EvidenceRecord } from "@/domain/schemas/evidence";
import type { ProvenanceRecord } from "@/domain/schemas/provenance";
import { ASSESSMENT_HEURISTIC_DISCLAIMER } from "@/application/assessment-view-models";
import {
  evidenceCatalogQueryToSearchParams,
  parseEvidenceCatalogSearchParams,
  type EvidenceCatalogQuery,
} from "@/application/evidence-catalog-query";
import type {
  EvidenceCatalogPageView,
  EvidenceCatalogRowView,
  ProvenanceCatalogRowView,
} from "@/application/evidence-catalog-view-models";
import {
  getTenantResearchReadModel,
  type OrgResearchRecord,
} from "@/application/research-read-model";
import { loadFinancialInstitutionsStore } from "@/repositories/synthetic-organization-repository";
import { DATASET_DECLARATION } from "@/verticals/financial-institutions/schema";
import { FINANCIAL_INSTITUTIONS_VOCABULARY } from "@/verticals/financial-institutions/vocabulary";

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    if (child && typeof child === "object" && !Object.isFrozen(child)) deepFreeze(child);
  }
  return value;
}

function hasPermission(
  context: AuthorizationContext,
  action: Parameters<typeof roleHasPermission>[1],
): boolean {
  return context.permissions.includes(action) && roleHasPermission(context.principal.role, action);
}

function label(value: string): string {
  const vocab = FINANCIAL_INSTITUTIONS_VOCABULARY as Record<string, string>;
  return vocab[value] ?? value.replace(/_/g, " ");
}

function dateLabel(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "Not provided";
}

function periodLabel(
  period: { start?: string | undefined; end?: string | undefined } | null | undefined,
): string {
  if (!period?.start && !period?.end) return "Not provided";
  if (period.start && period.end) return `${dateLabel(period.start)} to ${dateLabel(period.end)}`;
  return dateLabel(period.start ?? period.end);
}

function emptyFormValues(query: EvidenceCatalogQuery): EvidenceCatalogPageView["formValues"] {
  return {
    text: query.text ?? "",
    evidenceType: query.evidenceType ?? [],
    epistemicStatus: query.epistemicStatus ?? [],
    freshness: query.freshness ?? [],
    confidence: query.confidence ?? [],
    publicationEligibility: query.publicationEligibility ?? [],
    capability: query.capability ?? [],
    ruleOutcome: query.ruleOutcome ?? [],
    periodCategory: query.periodCategory ?? [],
    sourceType: query.sourceType ?? [],
    validationStatus: query.validationStatus ?? [],
    licenseStatus: query.licenseStatus ?? [],
    accessClassification: query.accessClassification ?? [],
    reportingPeriod: query.reportingPeriod ?? [],
    syntheticStatus: query.syntheticStatus ?? [],
    orgRef: query.orgRef ?? "",
    pageSize: query.pageSize,
  };
}

function pageWindow(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
}

function hrefFor(
  query: EvidenceCatalogQuery,
  overrides: Partial<EvidenceCatalogQuery> = {},
): string {
  const next = { ...query, ...overrides };
  const params = evidenceCatalogQueryToSearchParams(next);
  const qs = params.toString();
  return qs ? `/evidence?${qs}` : "/evidence";
}

function baseView(
  query: EvidenceCatalogQuery,
  unknownParams: readonly string[],
): Omit<EvidenceCatalogPageView, "rows" | "page" | "totalCount" | "totalPages" | "pagination"> {
  return {
    state: "ready",
    verticalLabel: "Financial institutions",
    syntheticNotice: DATASET_DECLARATION,
    heuristicDisclaimer: ASSESSMENT_HEURISTIC_DISCLAIMER,
    queryValid: true,
    unknownParams,
    view: query.view,
    formValues: emptyFormValues(query),
    activeFilters: activeFilters(query),
    clearAllHref: "/evidence",
    pageSize: query.pageSize,
  };
}

function activeFilters(query: EvidenceCatalogQuery): EvidenceCatalogPageView["activeFilters"] {
  const rows: { label: string; removeHref: string }[] = [];
  if (query.text) {
    rows.push({
      label: `Search: ${query.text}`,
      removeHref: hrefFor(query, { text: undefined, page: 1 }),
    });
  }
  if (query.orgRef) {
    rows.push({
      label: "Organization scope",
      removeHref: hrefFor(query, { orgRef: undefined, page: 1 }),
    });
  }
  const groups: Array<[keyof EvidenceCatalogQuery, string, readonly string[] | undefined]> = [
    ["evidenceType", "Evidence type", query.evidenceType],
    ["epistemicStatus", "Epistemic status", query.epistemicStatus],
    ["freshness", "Freshness", query.freshness],
    ["confidence", "Confidence", query.confidence],
    ["publicationEligibility", "Publication", query.publicationEligibility],
    ["capability", "Capability", query.capability],
    ["ruleOutcome", "Rule outcome", query.ruleOutcome],
    ["periodCategory", "Evidence period", query.periodCategory],
    ["sourceType", "Source type", query.sourceType],
    ["validationStatus", "Validation", query.validationStatus],
    ["licenseStatus", "License", query.licenseStatus],
    ["accessClassification", "Access", query.accessClassification],
    ["reportingPeriod", "Reporting period", query.reportingPeriod],
    ["syntheticStatus", "Synthetic status", query.syntheticStatus],
  ];
  for (const [key, groupLabel, values] of groups) {
    for (const value of values ?? []) {
      const remaining = (values ?? []).filter((item) => item !== value);
      rows.push({
        label: `${groupLabel}: ${label(value)}`,
        removeHref: hrefFor(query, {
          [key]: remaining.length > 0 ? remaining : undefined,
          page: 1,
        } as Partial<EvidenceCatalogQuery>),
      });
    }
  }
  return Object.freeze(rows);
}

function orgById(
  model: ReturnType<typeof getTenantResearchReadModel>,
): Map<string, OrgResearchRecord> {
  return new Map(model.organizations.map((org) => [org.organizationId, org] as const));
}

const CAPABILITY_KEYS = new Map<string, string>([
  ["cap_syn_fi_ops_analytics", "operational-analytics-support"],
  ["cap_syn_fi_data_quality", "data-quality-modernization"],
  ["cap_syn_fi_portfolio_reporting", "portfolio-reporting-workflow"],
  ["cap_syn_fi_scenario_planning", "scenario-planning-support"],
  ["cap_syn_fi_governance_review", "governance-process-review"],
] as const);

type EvidenceAssociations = {
  capabilities: ReadonlySet<string>;
  outcomes: ReadonlySet<string>;
};

function evidenceAssociations(
  model: ReturnType<typeof getTenantResearchReadModel>,
): ReadonlyMap<string, EvidenceAssociations> {
  const mutable = new Map<string, { capabilities: Set<string>; outcomes: Set<string> }>();
  for (const org of model.organizations) {
    for (const assessment of org.capabilityAssessments) {
      const capability = CAPABILITY_KEYS.get(assessment.capabilityId);
      for (const entry of assessment.ledger) {
        for (const evidenceId of entry.evidenceIds) {
          const row = mutable.get(evidenceId) ?? {
            capabilities: new Set<string>(),
            outcomes: new Set<string>(),
          };
          if (capability) row.capabilities.add(capability);
          row.outcomes.add(entry.outcome);
          mutable.set(evidenceId, row);
        }
      }
    }
  }
  return new Map(mutable);
}

function matchesMulti<T extends string>(value: T, allowed: readonly T[] | undefined): boolean {
  return !allowed || allowed.length === 0 || allowed.includes(value);
}

function matchesText(
  item: EvidenceRecord,
  org: OrgResearchRecord | undefined,
  text: string | undefined,
  canReadRestricted: boolean,
): boolean {
  if (!text) return true;
  const restricted = item.publicationEligibility === "restricted" && !canReadRestricted;
  const haystack = restricted
    ? [org?.displayName ?? "", label(item.evidenceType)].join(" ").toLowerCase()
    : [item.title, item.summary, org?.displayName ?? ""].join(" ").toLowerCase();
  return haystack.includes(text.toLowerCase());
}

function filterEvidence(
  items: readonly EvidenceRecord[],
  query: EvidenceCatalogQuery,
  orgs: ReadonlyMap<string, OrgResearchRecord>,
  associations: ReadonlyMap<string, EvidenceAssociations>,
  canReadRestricted: boolean,
): EvidenceRecord[] {
  return items.filter((item) => {
    const org = orgs.get(item.organizationId);
    if (!org) return false;
    if (query.orgRef && org.publicRef !== query.orgRef) return false;
    if (!matchesText(item, org, query.text, canReadRestricted)) return false;
    if (!matchesMulti(item.evidenceType, query.evidenceType)) return false;
    if (!matchesMulti(item.epistemicStatus, query.epistemicStatus)) return false;
    if (!matchesMulti(item.freshness, query.freshness)) return false;
    if (!matchesMulti(item.confidence, query.confidence)) return false;
    if (!matchesMulti(item.publicationEligibility, query.publicationEligibility)) return false;
    const periodCategory = item.effectivePeriod ? "known_period" : "unknown_period";
    if (!matchesMulti(periodCategory, query.periodCategory)) return false;
    const linked = associations.get(item.id);
    if (
      query.capability?.length &&
      !query.capability.some((value) => linked?.capabilities.has(value))
    ) {
      return false;
    }
    if (
      query.ruleOutcome?.length &&
      !query.ruleOutcome.some((value) => linked?.outcomes.has(value))
    ) {
      return false;
    }
    return true;
  });
}

function matchesProvenance(item: ProvenanceRecord, query: EvidenceCatalogQuery): boolean {
  if (!matchesMulti(item.sourceType, query.sourceType)) return false;
  if (!matchesMulti(item.validationStatus, query.validationStatus)) return false;
  if (!matchesMulti(item.licenseStatus, query.licenseStatus)) return false;
  if (!matchesMulti(item.accessClassification, query.accessClassification)) return false;
  const reportingPeriod = item.reportingPeriod ? "known_period" : "unknown_period";
  if (!matchesMulti(reportingPeriod, query.reportingPeriod)) return false;
  if (query.syntheticStatus?.length && !query.syntheticStatus.includes("synthetic")) return false;
  return true;
}

function evidenceRow(
  context: AuthorizationContext,
  item: EvidenceRecord,
  org: OrgResearchRecord,
  provenance: ProvenanceRecord | null,
): EvidenceCatalogRowView {
  const organizationDetailHref = `/organizations/${org.publicRef}`;
  if (
    (item.publicationEligibility === "restricted" ||
      provenance?.accessClassification === "restricted") &&
    !hasPermission(context, "evidence:restricted_read")
  ) {
    return {
      state: "restricted",
      title: "Restricted evidence",
      organizationName: org.displayName,
      organizationDetailHref,
      evidenceTypeLabel: label(item.evidenceType),
      freshness: item.freshness,
      confidence: item.confidence,
      publicationEligibility: "restricted",
      synthetic: true,
    };
  }
  return {
    state: "available",
    title: item.title,
    organizationName: org.displayName,
    organizationDetailHref,
    evidenceTypeLabel: label(item.evidenceType),
    epistemicStatusLabel: label(item.epistemicStatus),
    freshness: item.freshness,
    confidence: item.confidence,
    publicationEligibility: item.publicationEligibility,
    observedAtLabel: dateLabel(item.observedAt),
    summary: item.summary,
    provenanceSourceName: provenance?.sourceName ?? null,
    synthetic: true,
  };
}

function provenanceRow(item: ProvenanceRecord): ProvenanceCatalogRowView {
  return {
    state: "available",
    sourceName: item.sourceName,
    sourceTypeLabel: label(item.sourceType),
    validationStatus: label(item.validationStatus),
    licenseStatus: label(item.licenseStatus),
    accessClassification: label(item.accessClassification),
    retrievedAtLabel: dateLabel(item.retrievedAt),
    publishedAtLabel: dateLabel(item.publishedAt),
    reportingPeriodLabel: periodLabel(item.reportingPeriod),
    synthetic: true,
  };
}

export async function buildEvidenceCatalogPageView(
  context: AuthorizationContext,
  searchParams: Record<string, string | string[] | undefined>,
): Promise<EvidenceCatalogPageView> {
  const parsed = parseEvidenceCatalogSearchParams(searchParams);
  const defaults = parsed.ok ? parsed.query : parsed.defaults;

  try {
    assertPermission(context, "evidence:read");
    const model = getTenantResearchReadModel(context);

    if (!parsed.ok) {
      return deepFreeze({
        ...baseView(defaults, parsed.unknownParams),
        state: "malformed_query",
        queryValid: false,
        errorSummary: parsed.errorSummary,
        stateMessage: parsed.errorSummary,
        rows: [],
        page: 1,
        totalCount: 0,
        totalPages: 0,
        pagination: {
          previousHref: null,
          nextHref: null,
          pageHrefs: [],
          beyondRange: false,
          recoveryHref: "/evidence",
        },
      });
    }

    const query = parsed.query;
    const store = loadFinancialInstitutionsStore();
    const orgs = orgById(model);
    const associations = evidenceAssociations(model);
    const tenantEvidence = store.evidence.filter((item) => item.tenantId === context.tenant.id);
    const filteredEvidence = filterEvidence(
      tenantEvidence,
      query,
      orgs,
      associations,
      hasPermission(context, "evidence:restricted_read"),
    ).sort((a, b) => {
      const orgA = orgs.get(a.organizationId)?.displayName ?? "";
      const orgB = orgs.get(b.organizationId)?.displayName ?? "";
      return (
        orgA.localeCompare(orgB, "en") ||
        a.title.localeCompare(b.title, "en") ||
        a.evidenceType.localeCompare(b.evidenceType, "en")
      );
    });
    const provenanceById = new Map(
      store.provenance
        .filter((item) => item.tenantId === context.tenant.id)
        .map((item) => [item.id, item] as const),
    );

    const rows =
      query.view === "evidence"
        ? filteredEvidence.map((item) =>
            evidenceRow(
              context,
              item,
              orgs.get(item.organizationId)!,
              item.provenanceId ? (provenanceById.get(item.provenanceId) ?? null) : null,
            ),
          )
        : [
            ...new Set(
              filteredEvidence
                .filter(
                  (item) =>
                    item.publicationEligibility !== "restricted" ||
                    hasPermission(context, "evidence:restricted_read"),
                )
                .map((item) => item.provenanceId)
                .filter(Boolean),
            ),
          ]
            .map((id) => provenanceById.get(id as string))
            .filter((item): item is ProvenanceRecord => item !== undefined)
            .filter(
              (item) =>
                item.accessClassification !== "restricted" ||
                hasPermission(context, "evidence:restricted_read"),
            )
            .filter((item) => matchesProvenance(item, query))
            .sort((a, b) => a.sourceName.localeCompare(b.sourceName, "en"))
            .map(provenanceRow);

    const totalCount = rows.length;
    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / query.pageSize);
    const beyondRange = totalPages > 0 && query.page > totalPages;
    const pageItems = beyondRange
      ? []
      : rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize);
    const pageHrefs = pageWindow(query.page, totalPages).map((page) => ({
      page,
      href: hrefFor(query, { page }),
      current: page === query.page,
    }));

    return deepFreeze({
      ...baseView(query, parsed.unknownParams),
      rows: Object.freeze(pageItems),
      page: query.page,
      totalCount,
      totalPages,
      pagination: {
        previousHref:
          query.page > 1 && !beyondRange ? hrefFor(query, { page: query.page - 1 }) : null,
        nextHref:
          query.page < totalPages && !beyondRange ? hrefFor(query, { page: query.page + 1 }) : null,
        pageHrefs: Object.freeze(pageHrefs),
        beyondRange,
        recoveryHref: beyondRange ? hrefFor(query, { page: totalPages }) : null,
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return deepFreeze({
        ...baseView(defaults, parsed.ok ? parsed.unknownParams : parsed.unknownParams),
        state: "unauthorized",
        queryValid: false,
        stateMessage: "This workspace cannot load the evidence catalog.",
        rows: [],
        page: 1,
        totalCount: 0,
        totalPages: 0,
        pagination: {
          previousHref: null,
          nextHref: null,
          pageHrefs: [],
          beyondRange: false,
          recoveryHref: null,
        },
      });
    }
    return deepFreeze({
      ...baseView(defaults, parsed.ok ? parsed.unknownParams : parsed.unknownParams),
      state: "error",
      stateMessage: "The evidence catalog is temporarily unavailable.",
      rows: [],
      page: 1,
      totalCount: 0,
      totalPages: 0,
      pagination: {
        previousHref: null,
        nextHref: null,
        pageHrefs: [],
        beyondRange: false,
        recoveryHref: null,
      },
    });
  }
}
