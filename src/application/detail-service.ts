import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { assertPermission } from "@/authorization/context";
import { roleHasPermission } from "@/authorization/policy";
import { AuthorizationError } from "@/domain/errors";
import { DOMAIN_SCHEMA_VERSION } from "@/domain/ids";
import { ENGINE_VERSION } from "@/domain/assessments/quality";
import type { EvidenceRecord } from "@/domain/schemas/evidence";
import type { ObservationValue } from "@/domain/schemas/observation";
import type { ProvenanceRecord } from "@/domain/schemas/provenance";
import type { RuleLedgerEntry } from "@/domain/assessments/ledger";
import { fingerprintAssessmentOutput } from "@/assessment/fingerprint";
import { ASSESSMENT_HEURISTIC_DISCLAIMER } from "@/application/assessment-view-models";
import {
  conditionalDisclosure,
  getTenantResearchReadModel,
  reasonSummaryFromCodes,
  insufficientReasonCodes,
  bandLabel,
  capabilityNameById,
  type OrgResearchRecord,
} from "@/application/research-read-model";
import {
  fitStatusLabelFor,
  observedFitBandLabelFor,
  opportunityReasonLabelFor,
  outcomeLabelFor,
} from "@/application/assessment-view-models";
import { compareHrefFor } from "@/application/compare-query";
import { inboundBriefActionFor } from "@/application/inbound-brief-action";
import type {
  DetailCapabilitySectionView,
  DetailEvidenceCardView,
  DetailEvidenceSectionView,
  DetailGapsSectionView,
  DetailLedgerRowView,
  DetailLineageSectionView,
  DetailManifestView,
  DetailOverlayView,
  DetailPortfolioSummaryView,
  DetailProvenanceCardView,
  DetailSignalsSectionView,
  OrganizationDetailPageView,
} from "@/application/detail-view-models";
import {
  parseOrganizationPublicRef,
  type OrganizationPublicRef,
} from "@/domain/organization-public-ref";
import { loadFinancialInstitutionsStore } from "@/repositories/synthetic-organization-repository";
import { FINANCIAL_INSTITUTION_RULE_SETS } from "@/verticals/financial-institutions/assessment/rules";
import { SYNTHETIC_FI_PORTFOLIO } from "@/verticals/financial-institutions/assessment/synthetic-portfolio";
import {
  ASSESSED_AT,
  CATALOG_VERSION,
  METHODOLOGY_VERSION,
  PORTFOLIO_VERSION,
} from "@/verticals/financial-institutions/assessment/methodology";
import {
  DATASET_DECLARATION,
  FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
  FINANCIAL_INSTITUTIONS_FIXTURE_VERSION,
} from "@/verticals/financial-institutions/schema";
import { FINANCIAL_INSTITUTIONS_VOCABULARY } from "@/verticals/financial-institutions/vocabulary";
import { FINANCIAL_INSTITUTION_CAPABILITIES } from "@/verticals/financial-institutions/capabilities";

const MAX_SIGNALS = 12 as const;

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    if (child && typeof child === "object" && !Object.isFrozen(child)) {
      deepFreeze(child);
    }
  }
  return value;
}

function manifest(superseded = false): DetailManifestView {
  return {
    verticalLabel: "Financial institutions",
    engineVersion: ENGINE_VERSION,
    domainSchemaVersion: DOMAIN_SCHEMA_VERSION,
    adapterVersion: FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
    methodologyVersion: METHODOLOGY_VERSION,
    capabilityCatalogVersion: CATALOG_VERSION,
    portfolioVersion: PORTFOLIO_VERSION,
    datasetVersion: FINANCIAL_INSTITUTIONS_FIXTURE_VERSION,
    assessedAt: ASSESSED_AT,
    determinismVerified: true,
    superseded,
    syntheticNotice: DATASET_DECLARATION,
    heuristicDisclaimer: ASSESSMENT_HEURISTIC_DISCLAIMER,
  };
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

function observationLabel(observation: ObservationValue | null): string | null {
  if (!observation) return null;
  switch (observation.kind) {
    case "category_list":
      return observation.values.map(label).join(", ");
    case "integer":
    case "decimal":
      return `${observation.value}${"unit" in observation && observation.unit ? ` ${observation.unit}` : ""}`;
    case "band":
      return observation.label ?? label(observation.value);
    case "boolean":
      return observation.value ? "Yes" : "No";
    default:
      return label(String(observation.value));
  }
}

function ruleById() {
  const result = new Map<
    string,
    (typeof FINANCIAL_INSTITUTION_RULE_SETS)[number]["rules"][number]
  >();
  for (const set of FINANCIAL_INSTITUTION_RULE_SETS) {
    for (const rule of set.rules) {
      result.set(rule.ruleId, rule);
    }
  }
  return result;
}

type EvidenceUsage = {
  ruleTitles: readonly string[];
  capabilityNames: readonly string[];
};

function buildEvidenceUsage(org: OrgResearchRecord): ReadonlyMap<string, EvidenceUsage> {
  const rules = ruleById();
  const mutable = new Map<string, { rules: Set<string>; capabilities: Set<string> }>();
  for (const assessment of org.capabilityAssessments) {
    const capabilityName = capabilityNameById(assessment.capabilityId);
    for (const entry of assessment.ledger) {
      const title = rules.get(entry.ruleId)?.title ?? "Synthetic assessment rule";
      for (const evidenceId of entry.evidenceIds) {
        const usage = mutable.get(evidenceId) ?? {
          rules: new Set<string>(),
          capabilities: new Set<string>(),
        };
        usage.rules.add(title);
        usage.capabilities.add(capabilityName);
        mutable.set(evidenceId, usage);
      }
    }
  }
  return new Map(
    [...mutable.entries()].map(([id, usage]) => [
      id,
      {
        ruleTitles: Object.freeze([...usage.rules].sort((a, b) => a.localeCompare(b, "en"))),
        capabilityNames: Object.freeze(
          [...usage.capabilities].sort((a, b) => a.localeCompare(b, "en")),
        ),
      },
    ]),
  );
}

function evidenceTypeLabel(value: string): string {
  return label(value);
}

function evidenceCard(
  org: OrgResearchRecord,
  item: EvidenceRecord,
  provenance: ProvenanceRecord | null,
  canReadRestricted: boolean,
  usage: EvidenceUsage | undefined,
): DetailEvidenceCardView {
  const organizationDetailHref = `/organizations/${org.publicRef}`;
  if (
    (item.publicationEligibility === "restricted" ||
      provenance?.accessClassification === "restricted") &&
    !canReadRestricted
  ) {
    return {
      state: "restricted",
      title: "Restricted evidence",
      organizationName: org.displayName,
      organizationDetailHref,
      evidenceTypeLabel: evidenceTypeLabel(item.evidenceType),
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
    evidenceTypeLabel: evidenceTypeLabel(item.evidenceType),
    epistemicStatusLabel: label(item.epistemicStatus),
    freshness: item.freshness,
    confidence: item.confidence,
    publicationEligibility: item.publicationEligibility,
    observedAtLabel: dateLabel(item.observedAt),
    effectivePeriodLabel: periodLabel(item.effectivePeriod),
    summary: item.summary,
    observationLabel: observationLabel(item.observation),
    provenanceSourceName: provenance?.sourceName ?? null,
    calculatedInputDescription:
      item.epistemicStatus === "calculated"
        ? "Calculated from declared synthetic profile inputs."
        : null,
    ruleBasedMethodologyLabel:
      item.epistemicStatus === "rule_based"
        ? "Derived under the active synthetic methodology version."
        : null,
    supportedRuleTitles: usage?.ruleTitles ?? [],
    affectedCapabilities: usage?.capabilityNames ?? [],
    synthetic: true,
  };
}

function buildEvidenceSection(
  context: AuthorizationContext,
  org: OrgResearchRecord,
  evidence: readonly EvidenceRecord[],
  provenanceById: ReadonlyMap<string, ProvenanceRecord>,
  evidenceUsage: ReadonlyMap<string, EvidenceUsage>,
): DetailEvidenceSectionView {
  if (!hasPermission(context, "evidence:read")) {
    return {
      state: "restricted",
      cards: [],
      total: 0,
      restrictedCount: 0,
      message: "Evidence is restricted for this workspace role.",
    };
  }

  const canReadRestricted = hasPermission(context, "evidence:restricted_read");
  const cards = evidence.map((item) =>
    evidenceCard(
      org,
      item,
      item.provenanceId ? (provenanceById.get(item.provenanceId) ?? null) : null,
      canReadRestricted,
      evidenceUsage.get(item.id),
    ),
  );
  return {
    state: "available",
    cards: Object.freeze(cards),
    total: evidence.length,
    restrictedCount: evidence.filter((item) => item.publicationEligibility === "restricted").length,
  };
}

function buildProvenanceCards(
  context: AuthorizationContext,
  evidence: readonly EvidenceRecord[],
  provenanceById: ReadonlyMap<string, ProvenanceRecord>,
): { cards: readonly DetailProvenanceCardView[]; total: number } {
  if (!hasPermission(context, "evidence:read")) return { cards: [], total: 0 };
  const canReadRestricted = hasPermission(context, "evidence:restricted_read");
  const visibleProvenanceIds = new Set(
    evidence
      .filter((item) => {
        const provenance = item.provenanceId ? provenanceById.get(item.provenanceId) : undefined;
        return (
          canReadRestricted ||
          (item.publicationEligibility !== "restricted" &&
            provenance?.accessClassification !== "restricted")
        );
      })
      .map((item) => item.provenanceId)
      .filter((item): item is string => item !== null),
  );
  const cards: DetailProvenanceCardView[] = [];
  for (const provenanceId of visibleProvenanceIds) {
    const provenance = provenanceById.get(provenanceId);
    if (!provenance) continue;
    cards.push({
      sourceName: provenance.sourceName,
      sourceTypeLabel: label(provenance.sourceType),
      validationStatus: label(provenance.validationStatus),
      licenseStatus: label(provenance.licenseStatus),
      accessClassification: label(provenance.accessClassification),
      retrievedAtLabel: dateLabel(provenance.retrievedAt),
      publishedAtLabel: dateLabel(provenance.publishedAt),
      reportingPeriodLabel: periodLabel(provenance.reportingPeriod),
      checksumIndicator: provenance.checksum
        ? "Synthetic source checksum recorded"
        : "No checksum recorded",
      notes: "Synthetic fixture source · architecture validation only.",
      synthetic: true,
    });
  }
  return { cards: Object.freeze(cards), total: cards.length };
}

function lineageForEntry(
  entry: RuleLedgerEntry,
  evidenceById: ReadonlyMap<string, EvidenceRecord>,
  canReadEvidence: boolean,
  canReadRestricted: boolean,
): readonly string[] {
  if (!canReadEvidence) {
    return entry.outcome === "awarded"
      ? Object.freeze(["Evidence labels restricted for this workspace role"])
      : Object.freeze([]);
  }
  const lines: string[] = [];
  for (const evidenceId of entry.evidenceIds) {
    const evidence = evidenceById.get(evidenceId);
    if (!evidence) continue;
    if (evidence.publicationEligibility === "restricted" && !canReadRestricted) {
      lines.push("Restricted evidence");
    } else {
      lines.push(evidence.title);
    }
  }
  if (lines.length === 0 && entry.outcome === "awarded") {
    lines.push("Supported by validated synthetic observation");
  }
  return Object.freeze([...new Set(lines)]);
}

function buildCapabilities(
  context: AuthorizationContext,
  org: OrgResearchRecord,
  evidenceById: ReadonlyMap<string, EvidenceRecord>,
): readonly DetailCapabilitySectionView[] {
  const rules = ruleById();
  const canReadEvidence = hasPermission(context, "evidence:read");
  const canReadRestricted = hasPermission(context, "evidence:restricted_read");
  return Object.freeze(
    [...org.capabilityAssessments]
      .sort((a, b) => {
        const priority = (capabilityId: string) =>
          SYNTHETIC_FI_PORTFOLIO.capabilities.find((cap) => cap.capabilityId === capabilityId)
            ?.priority ?? 0;
        return (
          priority(b.capabilityId) - priority(a.capabilityId) ||
          capabilityNameById(a.capabilityId).localeCompare(capabilityNameById(b.capabilityId), "en")
        );
      })
      .map((assessment, index) => {
        const contextForCapability = org.portfolio.opportunityContexts.find(
          (item) => item.capabilityId === assessment.capabilityId,
        );
        const ledgerRows: DetailLedgerRowView[] = assessment.ledger.map((entry) => {
          const rule = rules.get(entry.ruleId);
          const requiredTypes = rule?.evidenceRequirements.requiredEvidenceTypes ?? [];
          return {
            ruleTitle: rule?.title ?? "Synthetic assessment rule",
            factorCategoryLabel: label(entry.factorCategory),
            outcomeLabel: outcomeLabelFor(entry.outcome),
            pointsAwarded: entry.pointsAwarded,
            maximumPoints: entry.maximumPoints,
            reason: entry.reason,
            requirementLabel:
              requiredTypes.length > 0
                ? `Required evidence: ${requiredTypes.map(label).join(", ")}`
                : "Optional supporting evidence",
            ruleVersion: entry.ruleSetVersion,
            publicationEligibility: entry.publicationEligibility,
            freshnessSummary:
              entry.freshnessStates.length > 0
                ? entry.freshnessStates.map(label).join(", ")
                : "No freshness state",
            epistemicSummary:
              entry.epistemicStates.length > 0
                ? entry.epistemicStates.map(label).join(", ")
                : "No epistemic state",
            lineage: lineageForEntry(entry, evidenceById, canReadEvidence, canReadRestricted),
          };
        });

        const factorMap = new Map<string, { awarded: number; maximum: number }>();
        for (const row of ledgerRows) {
          const current = factorMap.get(row.factorCategoryLabel) ?? { awarded: 0, maximum: 0 };
          current.awarded += row.pointsAwarded;
          current.maximum += row.maximumPoints;
          factorMap.set(row.factorCategoryLabel, current);
        }
        const missingCount = assessment.ledger.filter(
          (row) => row.outcome.startsWith("not_evaluated_") || row.outcome === "blocked_by_gate",
        ).length;
        const capability = FINANCIAL_INSTITUTION_CAPABILITIES.find(
          (item) => item.id === assessment.capabilityId,
        );

        const base = {
          anchorId: `capability-${index + 1}`,
          capabilityName: capabilityNameById(assessment.capabilityId),
          description: capability?.description ?? "Synthetic capability assessment.",
          categoryLabel: label(capability?.category ?? "capability"),
          priority:
            SYNTHETIC_FI_PORTFOLIO.capabilities.find(
              (cap) => cap.capabilityId === assessment.capabilityId,
            )?.priority ?? 0,
          statusLabel: fitStatusLabelFor(assessment.fit.status),
          confidence: assessment.confidence,
          freshness: assessment.freshness,
          assessmentCompleteness: assessment.completeness,
          publicationEligibility: assessment.publicationEligibility,
          opportunityContextStatus: contextForCapability?.status ?? "unknown",
          opportunityContextLabel: opportunityReasonLabelFor(
            contextForCapability?.status ?? "unknown",
          ),
          requiredEvidenceGateStatus: assessment.ledger.some(
            (row) => row.outcome === "blocked_by_gate",
          )
            ? "Required evidence gate not satisfied"
            : "Required evidence gate satisfied",
          factorContributions: Object.freeze(
            [...factorMap.entries()].map(([factorCategoryLabel, values]) => ({
              factorCategoryLabel,
              awardedPoints: values.awarded,
              maximumPoints: values.maximum,
            })),
          ),
          evidenceGapSummary:
            missingCount > 0
              ? `${missingCount} rule outcome${missingCount === 1 ? "" : "s"} require additional or reviewable evidence. Missing evidence was not scored as negative alignment.`
              : "No unresolved rule-evidence gaps in this synthetic assessment.",
          limitations: Object.freeze([
            "This capability assessment uses synthetic evidence only.",
            "Observed alignment is a deterministic prioritization heuristic; human judgment is required.",
          ]),
          ledgerRows: Object.freeze(ledgerRows),
        };

        if (assessment.fit.status !== "assessed") return base;
        return {
          ...base,
          pointsAwarded: assessment.fit.pointsAwarded,
          pointsPossible: assessment.fit.pointsPossible,
          bandLabel: observedFitBandLabelFor(assessment.fit.band),
        };
      }),
  );
}

function buildPortfolioSummary(org: OrgResearchRecord): DetailPortfolioSummaryView {
  const bestCapability = org.portfolio.bestObservedCapabilityFit?.capabilityId
    ? capabilityNameById(org.portfolio.bestObservedCapabilityFit.capabilityId)
    : "Not available";
  const base = {
    portfolioName: SYNTHETIC_FI_PORTFOLIO.name,
    statusLabel: fitStatusLabelFor(org.portfolio.status),
    coverage: {
      enabledCapabilityCount: org.portfolio.coverage.enabledCapabilityCount,
      assessedCapabilityCount: org.portfolio.coverage.assessedCapabilityCount,
      insufficientCapabilityCount: org.portfolio.coverage.insufficientCapabilityCount,
      enabledPriorityWeight: org.portfolio.coverage.enabledPriorityWeight,
      assessedPriorityWeight: org.portfolio.coverage.assessedPriorityWeight,
      conditionalOnAssessedCapabilities: true as const,
    },
    confidence: org.portfolio.confidence,
    freshness: org.portfolio.freshness,
    assessmentCompleteness: org.portfolio.completeness,
    publicationEligibility: org.portfolio.publicationEligibility,
    opportunityContextStatus: org.opportunityContextStatus,
    opportunityContextLabel: org.opportunityContextLabel,
    bestObservedCapability: bestCapability,
    methodologyVersion: METHODOLOGY_VERSION,
    assessedAt: org.portfolio.assessedAt,
    ...(org.portfolio.status === "insufficient_evidence"
      ? {
          insufficiencyExplanation:
            "No portfolio score or observed-alignment band is shown because required capability coverage was not met. Missing capability weight is not negative fit.",
        }
      : {}),
    disclaimer: ASSESSMENT_HEURISTIC_DISCLAIMER,
  };
  const score = org.portfolio.portfolioPriorityScore;
  if (!score) return base;
  return {
    ...base,
    conditionalScore: {
      pointsAwarded: score.pointsAwarded,
      pointsPossible: score.pointsPossible,
      bandLabel: bandLabel(score.band),
      disclosure: conditionalDisclosure(org),
    },
  };
}

function buildLineage(
  capabilities: readonly DetailCapabilitySectionView[],
): DetailLineageSectionView {
  return {
    rows: Object.freeze(
      capabilities.map((cap) => {
        const awarded = cap.ledgerRows.filter((row) => row.outcomeLabel === "Awarded");
        return {
          capabilityName: cap.capabilityName,
          awardedRuleCount: awarded.length,
          awardedPoints: awarded.reduce((sum, row) => sum + row.pointsAwarded, 0),
          explanation:
            awarded.length > 0
              ? "Awarded rows cite publication-safe synthetic evidence titles."
              : "No awarded rows for this capability assessment.",
        };
      }),
    ),
  };
}

function buildSignals(
  org: OrgResearchRecord,
  evidenceUsage: ReadonlyMap<string, EvidenceUsage>,
  provenanceById: ReadonlyMap<string, ProvenanceRecord>,
): DetailSignalsSectionView {
  const ordered = [...org.changeSignals].sort((a, b) => {
    const dateA = a.effectivePeriod?.end ?? a.effectivePeriod?.start ?? a.observedAt ?? "";
    const dateB = b.effectivePeriod?.end ?? b.effectivePeriod?.start ?? b.observedAt ?? "";
    return dateB.localeCompare(dateA) || a.title.localeCompare(b.title, "en");
  });
  const mappedRows = ordered.slice(0, MAX_SIGNALS).map((signal) => {
    const usage = evidenceUsage.get(signal.id);
    const provenance = signal.provenanceId ? provenanceById.get(signal.provenanceId) : undefined;
    return {
      title: signal.title,
      observedAtLabel: dateLabel(signal.observedAt),
      effectivePeriodLabel: periodLabel(signal.effectivePeriod),
      freshness: signal.freshness,
      epistemicStatusLabel: label(signal.epistemicStatus),
      publicationEligibility: signal.publicationEligibility,
      affectedCapabilities: usage?.capabilityNames ?? [],
      relevanceExplanation:
        usage && usage.ruleTitles.length > 0
          ? `Supports ${usage.ruleTitles.length} deterministic rule outcome${usage.ruleTitles.length === 1 ? "" : "s"}; it does not indicate demand or purchase intent.`
          : "Signal retained for human review; it does not indicate demand or purchase intent.",
      provenanceSummary: provenance?.sourceName ?? "Synthetic fixture source",
      synthetic: true as const,
    };
  });
  const rows = mappedRows.filter(
    (row) => row.observedAtLabel !== "Not provided" || row.effectivePeriodLabel !== "Not provided",
  );
  const unknownDateRows = mappedRows.filter(
    (row) => row.observedAtLabel === "Not provided" && row.effectivePeriodLabel === "Not provided",
  );
  return {
    rows: Object.freeze(rows),
    unknownDateRows: Object.freeze(unknownDateRows),
    total: ordered.length,
    maxRows: MAX_SIGNALS,
  };
}

function buildGaps(
  org: OrgResearchRecord,
  evidence: readonly EvidenceRecord[],
  provenanceById: ReadonlyMap<string, ProvenanceRecord>,
): DetailGapsSectionView {
  const capabilityRows = org.capabilityAssessments
    .filter((assessment) => assessment.fit.status === "insufficient_evidence")
    .map((assessment) => {
      const reasonCodes = insufficientReasonCodes({
        ...org,
        capabilityAssessments: [assessment],
      });
      return {
        capabilityName: capabilityNameById(assessment.capabilityId),
        reasonKind: reasonCodes.map(label).join(", ") || "Insufficient evidence",
        reasonSummary: reasonSummaryFromCodes(reasonCodes),
        actionLabel: "Additional evidence required; human review is required.",
        unresolvedPriorityWeight:
          SYNTHETIC_FI_PORTFOLIO.capabilities.find(
            (cap) => cap.capabilityId === assessment.capabilityId,
          )?.priority ?? 0,
      };
    });
  const portfolioRows: DetailGapsSectionView["rows"][number][] = [];
  if (
    org.portfolio.coverage.assessedPriorityWeight < org.portfolio.coverage.enabledPriorityWeight
  ) {
    portfolioRows.push({
      capabilityName: "Portfolio assessment",
      reasonKind: "Conditional coverage",
      reasonSummary:
        "The portfolio result covers assessed capabilities only. Unassessed weight is not negative alignment.",
      actionLabel: "Review unresolved capability evidence before broader use.",
      unresolvedPriorityWeight:
        org.portfolio.coverage.enabledPriorityWeight -
        org.portfolio.coverage.assessedPriorityWeight,
    });
  }
  if (org.portfolio.confidence === "low") {
    portfolioRows.push({
      capabilityName: "Portfolio assessment",
      reasonKind: "Low confidence",
      reasonSummary:
        "Required evidence coverage limits confidence in this synthetic portfolio result.",
      actionLabel: "Human judgment required.",
      unresolvedPriorityWeight: 0,
    });
  }
  const staleCount = evidence.filter((item) => item.freshness === "stale").length;
  if (staleCount > 0) {
    portfolioRows.push({
      capabilityName: "Evidence record",
      reasonKind: "Stale evidence",
      reasonSummary: `${staleCount} evidence record${staleCount === 1 ? " is" : "s are"} stale. Original observation dates remain visible.`,
      actionLabel: "Review a newer observation before publication.",
      unresolvedPriorityWeight: 0,
    });
  }
  const restrictedCount = evidence.filter(
    (item) => item.publicationEligibility === "restricted",
  ).length;
  if (restrictedCount > 0) {
    portfolioRows.push({
      capabilityName: "Evidence record",
      reasonKind: "Restricted evidence",
      reasonSummary: `${restrictedCount} restricted evidence record${restrictedCount === 1 ? " requires" : "s require"} explicit permission; contents are not disclosed.`,
      actionLabel: "Use only within authorized review.",
      unresolvedPriorityWeight: 0,
    });
  }
  const unknownLicenseCount = evidence.filter((item) => {
    const source = item.provenanceId ? provenanceById.get(item.provenanceId) : undefined;
    return !source || source.licenseStatus === "unknown";
  }).length;
  if (unknownLicenseCount > 0) {
    portfolioRows.push({
      capabilityName: "Source provenance",
      reasonKind: "Unknown provenance or license",
      reasonSummary: `${unknownLicenseCount} evidence record${unknownLicenseCount === 1 ? " lacks" : "s lack"} publication-ready provenance or license status.`,
      actionLabel: "Resolve provenance before external publication.",
      unresolvedPriorityWeight: 0,
    });
  }
  return {
    rows: Object.freeze([...capabilityRows, ...portfolioRows]),
  };
}

function buildOverlay(context: AuthorizationContext, org: OrgResearchRecord): DetailOverlayView {
  if (!hasPermission(context, "overlay:read")) {
    return {
      state: "restricted",
      message: "Overlay access is restricted for this workspace role.",
    };
  }
  if (!org.overlay) {
    return {
      state: "omitted",
      message:
        "No tenant-provided relationship context. Relationship and capability-usage state remain unknown.",
    };
  }
  return {
    state: "available",
    relationshipStatusLabel: label(org.overlay.relationshipStatus),
    matchStatusLabel: label(org.overlay.matchStatus),
    reviewStatusLabel: label(org.overlay.reviewStatus),
    sourceClassificationLabel: label(org.overlay.sourceClassification),
    effectiveAtLabel: dateLabel(org.overlay.effectiveAt),
    updatedAtLabel: dateLabel(org.overlay.updatedAt),
    capabilityUsage: Object.freeze(
      org.overlay.capabilityUsage.map((item) => ({
        capabilityName: capabilityNameById(item.capabilityId),
        usageStatusLabel: label(item.usageStatus),
      })),
    ),
  };
}

function buildFingerprint(org: OrgResearchRecord) {
  const value = fingerprintAssessmentOutput(
    [...org.assessmentOutputFingerprints].sort((a, b) => a.localeCompare(b)),
  ).slice(0, 12);
  return {
    value,
    algorithm: "sha256" as const,
    label: "Composite assessment fingerprint preview; not a signature or digital signature",
  };
}

export function resolveOrganizationByPublicRef(
  context: AuthorizationContext,
  organizationRefParam: string,
): OrgResearchRecord | null {
  const ref = parseOrganizationPublicRef(organizationRefParam);
  if (!ref) return null;
  const model = getTenantResearchReadModel(context);
  return model.organizations.find((org) => org.publicRef === ref) ?? null;
}

export async function buildOrganizationDetailPageView(
  context: AuthorizationContext,
  organizationRefParam: string,
): Promise<OrganizationDetailPageView> {
  const ref: OrganizationPublicRef | null = parseOrganizationPublicRef(organizationRefParam);
  if (!ref) {
    return deepFreeze({
      state: "malformed",
      stateMessage: "The organization reference is malformed.",
      manifest: manifest(),
    });
  }

  try {
    assertPermission(context, "organization:read");
    assertPermission(context, "assessment:read");
    const model = getTenantResearchReadModel(context);
    const org = model.organizations.find((item) => item.publicRef === ref);
    if (!org) {
      return deepFreeze({
        state: "not_found",
        stateMessage: "Organization not found.",
        manifest: manifest(),
      });
    }
    if (
      org.adapterVersion !== FINANCIAL_INSTITUTIONS_ADAPTER_VERSION ||
      model.methodologyVersion !== METHODOLOGY_VERSION
    ) {
      return deepFreeze({
        state: "unavailable",
        stateMessage: "This organization uses an unsupported research model version.",
        manifest: manifest(),
      });
    }

    const store = loadFinancialInstitutionsStore();
    const evidence = store.evidence
      .filter(
        (item) => item.tenantId === context.tenant.id && item.organizationId === org.organizationId,
      )
      .sort((a, b) => a.title.localeCompare(b.title, "en"));
    const evidenceById = new Map(evidence.map((item) => [item.id, item] as const));
    const provenanceIds = new Set(
      evidence.map((item) => item.provenanceId).filter((item): item is string => item !== null),
    );
    const provenanceById = new Map(
      store.provenance
        .filter((item) => item.tenantId === context.tenant.id && provenanceIds.has(item.id))
        .map((item) => [item.id, item] as const),
    );
    const evidenceUsage = buildEvidenceUsage(org);

    const capabilities = buildCapabilities(context, org, evidenceById);
    const briefAction = inboundBriefActionFor(context, org);
    const view: OrganizationDetailPageView = {
      state: "ok",
      header: {
        displayName: org.displayName,
        detailHref: `/organizations/${org.publicRef}`,
        compareHref: compareHrefFor([org.publicRef]),
        compareActionLabel: `Add ${org.displayName} to comparison`,
        briefHref: briefAction?.briefHref ?? null,
        briefActionLabel: briefAction?.briefActionLabel ?? null,
        organizationType: org.organizationType,
        lifecycleStatus: org.lifecycleStatus,
        locationLabel: org.locationLabel,
        verticalLabel: org.verticalLabel,
        verticalSummary: org.verticalSummary,
        tags: Object.freeze([...org.tags]),
        warnings: Object.freeze([
          ...(org.portfolio.status === "insufficient_evidence"
            ? ["Portfolio assessment has insufficient evidence."]
            : []),
          ...(org.portfolio.coverage.assessedPriorityWeight <
          org.portfolio.coverage.enabledPriorityWeight
            ? ["Portfolio score is conditional on assessed capability coverage."]
            : []),
          ...(org.portfolio.freshness === "stale"
            ? ["Portfolio assessment includes stale evidence."]
            : []),
          ...(org.portfolio.publicationEligibility !== "eligible"
            ? ["Publication requires review or remains restricted."]
            : []),
          ...(org.excluded ? ["Excluded from default opportunity review."] : []),
        ]),
        synthetic: true,
      },
      profile: {
        summary: org.summary,
        facts: Object.freeze([
          { label: "Organization type", value: label(org.organizationType) },
          { label: "Lifecycle status", value: label(org.lifecycleStatus) },
          { label: "Safe synthetic location", value: org.locationLabel },
          { label: "Data classification", value: label(org.dataClassification) },
          { label: "Institution kind", value: label(org.payload.institutionKind) },
          { label: "Balance-sheet scale", value: label(org.payload.balanceSheetScaleBand) },
          { label: "Service-area type", value: label(org.payload.serviceAreaType) },
          { label: "Ownership model", value: label(org.payload.ownershipModel) },
          {
            label: "Operating regions",
            value: org.payload.operatingRegions.map(label).join(", "),
          },
          { label: "Digital-service maturity", value: label(org.payload.digitalServiceMaturity) },
          { label: "Lending breadth", value: label(org.payload.lendingBreadth) },
          { label: "Operating complexity", value: label(org.payload.operatingComplexityBand) },
          {
            label: "Regulatory-data availability",
            value: label(org.payload.regulatoryDataAvailability),
          },
          { label: "Synthetic status", value: "Fictional synthetic organization" },
        ]),
      },
      portfolioSummary: buildPortfolioSummary(org),
      capabilities,
      evidence: buildEvidenceSection(context, org, evidence, provenanceById, evidenceUsage),
      provenance: buildProvenanceCards(context, evidence, provenanceById),
      lineage: buildLineage(capabilities),
      signals: buildSignals(org, evidenceUsage, provenanceById),
      gaps: buildGaps(org, evidence, provenanceById),
      overlay: buildOverlay(context, org),
      fingerprint: buildFingerprint(org),
      manifest: manifest(org.portfolio.status === "superseded"),
    };
    return deepFreeze(view);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return deepFreeze({
        state: "unauthorized",
        stateMessage: "This workspace cannot load the organization detail.",
        manifest: manifest(),
      });
    }
    return deepFreeze({
      state: "error",
      stateMessage: "The organization detail is temporarily unavailable.",
      manifest: manifest(),
    });
  }
}
