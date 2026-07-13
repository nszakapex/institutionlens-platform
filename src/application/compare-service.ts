import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { assertPermission } from "@/authorization/context";
import { roleHasPermission, type Action } from "@/authorization/policy";
import {
  MAX_COMPARE_ORGS,
  MIN_COMPARE_ORGS,
  compareHrefFor,
  compareHrefWithout,
  parseCompareSearchParams,
} from "@/application/compare-query";
import type {
  CompareCapabilityColumnView,
  CompareCapabilityEvidenceView,
  CompareColumnView,
  CompareConditionalScoreView,
  CompareDifferenceRowView,
  CompareDifferenceState,
  CompareMissingSlotView,
  CompareOverlayProjectionView,
  ComparePageView,
} from "@/application/compare-view-models";
import { COMPARE_DIFFERENCE_STATE_LABELS } from "@/application/compare-view-models";
import {
  conditionalPortfolioScoreDisclosure,
  fitStatusLabelFor,
  observedFitBandLabelFor,
} from "@/application/assessment-view-models";
import {
  getTenantResearchReadModel,
  type OrgResearchRecord,
  type TenantResearchReadModel,
} from "@/application/research-read-model";
import { AuthorizationError } from "@/domain/errors";
import type { OrganizationPublicRef } from "@/domain/organization-public-ref";
import type { EvidenceRecord } from "@/domain/schemas/evidence";
import type { ProvenanceRecord } from "@/domain/schemas/provenance";
import {
  FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
  FINANCIAL_INSTITUTIONS_FIXTURE_VERSION,
} from "@/verticals/financial-institutions/schema";
import {
  ASSESSED_AT,
  METHODOLOGY_VERSION,
} from "@/verticals/financial-institutions/assessment/methodology";
import { SYNTHETIC_FI_PORTFOLIO } from "@/verticals/financial-institutions/assessment/synthetic-portfolio";
import { loadFinancialInstitutionsStore } from "@/repositories/synthetic-organization-repository";
import { FINANCIAL_INSTITUTIONS_VOCABULARY } from "@/verticals/financial-institutions/vocabulary";

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  Object.freeze(value);
  for (const child of Object.values(value)) {
    if (child && typeof child === "object" && !Object.isFrozen(child)) {
      deepFreeze(child);
    }
  }
  return value;
}

function hasPermission(context: AuthorizationContext, action: Action): boolean {
  return context.permissions.includes(action) && roleHasPermission(context.principal.role, action);
}

function label(value: string): string {
  const vocab = FINANCIAL_INSTITUTIONS_VOCABULARY as Record<string, string>;
  return vocab[value] ?? value.replace(/_/g, " ");
}

function statusLabel(status: string): string {
  if (status === "insufficient_evidence") return "Insufficient evidence";
  if (status === "assessed") return "Assessed";
  return label(status);
}

function manifest() {
  return {
    methodologyVersion: METHODOLOGY_VERSION,
    datasetVersion: FINANCIAL_INSTITUTIONS_FIXTURE_VERSION,
    asAssessedAt: ASSESSED_AT,
    syntheticNotice:
      "Synthetic comparison only. Differences are research contrasts, not investment recommendations.",
    maxOrganizations: MAX_COMPARE_ORGS,
    minOrganizations: MIN_COMPARE_ORGS,
  };
}

function baseView(
  partial: Omit<ComparePageView, "manifest" | "differences"> & {
    manifest?: ComparePageView["manifest"];
    differences?: ComparePageView["differences"];
  },
): ComparePageView {
  return deepFreeze({
    manifest: manifest(),
    differences: Object.freeze([]),
    ...partial,
  });
}

function publicationAllowsNumericFit(eligibility: string): boolean {
  return eligibility === "eligible" || eligibility === "internal_only";
}

function portfolioScore(org: OrgResearchRecord): CompareConditionalScoreView | undefined {
  const score = org.portfolio.portfolioPriorityScore;
  if (!score) return undefined;
  if (!publicationAllowsNumericFit(org.portfolio.publicationEligibility)) return undefined;
  if (org.portfolio.status !== "assessed") return undefined;
  return {
    pointsAwarded: score.pointsAwarded,
    pointsPossible: score.pointsPossible,
    bandLabel: observedFitBandLabelFor(score.band),
    disclosure: conditionalPortfolioScoreDisclosure(org.portfolio.coverage),
  };
}

function capabilityName(model: TenantResearchReadModel, capabilityId: string): string {
  return (
    model.capabilityCatalog.find((item) => item.capabilityId === capabilityId)?.name ??
    "Synthetic capability"
  );
}

function capabilityPriority(capabilityId: string): number {
  return (
    SYNTHETIC_FI_PORTFOLIO.capabilities.find((item) => item.capabilityId === capabilityId)
      ?.priority ?? 0
  );
}

function orderedAssessments(org: OrgResearchRecord) {
  return [...org.capabilityAssessments].sort((a, b) => {
    const priorityDelta = capabilityPriority(b.capabilityId) - capabilityPriority(a.capabilityId);
    return priorityDelta || a.capabilityId.localeCompare(b.capabilityId);
  });
}

function buildCapabilities(
  model: TenantResearchReadModel,
  org: OrgResearchRecord,
): readonly CompareCapabilityColumnView[] {
  return Object.freeze(
    orderedAssessments(org).map((assessment) => {
      const fit = assessment.fit;
      const base: CompareCapabilityColumnView = {
        capabilityName: capabilityName(model, assessment.capabilityId),
        statusLabel: fitStatusLabelFor(fit.status),
        confidence: assessment.confidence,
        freshness: assessment.freshness,
        assessmentCompleteness: assessment.completeness,
        publicationEligibility: assessment.publicationEligibility,
      };
      if (
        fit.status === "assessed" &&
        publicationAllowsNumericFit(assessment.publicationEligibility)
      ) {
        return {
          ...base,
          conditionalScore: {
            pointsAwarded: fit.pointsAwarded,
            pointsPossible: fit.pointsPossible,
            bandLabel: observedFitBandLabelFor(fit.band),
            disclosure:
              "Capability observed-alignment score from the existing Phase 4 assessment; not recalculated for comparison.",
          },
        };
      }
      return base;
    }),
  );
}

function visibleEvidenceForOrg(
  context: AuthorizationContext,
  org: OrgResearchRecord,
  evidence: readonly EvidenceRecord[],
  provenanceById: ReadonlyMap<string, ProvenanceRecord>,
): readonly EvidenceRecord[] {
  if (!hasPermission(context, "evidence:read")) return Object.freeze([]);
  const canReadRestricted = hasPermission(context, "evidence:restricted_read");
  return Object.freeze(
    evidence.filter((item) => {
      if (item.organizationId !== org.organizationId) return false;
      if (item.tenantId !== context.tenant.id) return false;
      if (item.publicationEligibility === "restricted" && !canReadRestricted) return false;
      const provenance = item.provenanceId ? provenanceById.get(item.provenanceId) : undefined;
      if (provenance?.accessClassification === "restricted" && !canReadRestricted) return false;
      return true;
    }),
  );
}

function buildEvidenceByCapability(
  context: AuthorizationContext,
  model: TenantResearchReadModel,
  org: OrgResearchRecord,
  visibleEvidence: readonly EvidenceRecord[],
  provenanceById: ReadonlyMap<string, ProvenanceRecord>,
): readonly CompareCapabilityEvidenceView[] {
  const evidenceById = new Map(visibleEvidence.map((item) => [item.id, item] as const));

  return Object.freeze(
    orderedAssessments(org).map((assessment) => {
      const linkedIds = new Set<string>();
      for (const entry of assessment.ledger) {
        for (const evidenceId of entry.evidenceIds) {
          if (evidenceById.has(evidenceId)) linkedIds.add(evidenceId);
        }
      }
      const linked = [...linkedIds]
        .map((id) => evidenceById.get(id)!)
        .sort((a, b) => a.title.localeCompare(b.title, "en"));

      const provenanceNames = new Set<string>();
      for (const item of linked) {
        const provenance = item.provenanceId ? provenanceById.get(item.provenanceId) : undefined;
        if (provenance) provenanceNames.add(provenance.sourceName);
      }

      const missingOutcomes = assessment.ledger.filter(
        (entry) =>
          entry.outcome.startsWith("not_evaluated_") || entry.outcome === "blocked_by_gate",
      ).length;

      let gapLabel = "No unresolved evidence gaps in this synthetic capability assessment.";
      if (assessment.fit.status === "insufficient_evidence") {
        gapLabel =
          "Insufficient evidence for this capability. Missing evidence is not scored as negative alignment.";
      } else if (missingOutcomes > 0) {
        gapLabel = `${missingOutcomes} rule outcome${missingOutcomes === 1 ? "" : "s"} require additional or reviewable evidence. Missing evidence is not a missing capability.`;
      }

      const provenanceSummary = !hasPermission(context, "evidence:read")
        ? "Evidence labels restricted for this workspace role."
        : provenanceNames.size === 0
          ? linked.length === 0
            ? "No permitted linked evidence titles for this capability."
            : "Linked evidence without separate provenance cards."
          : `${provenanceNames.size} permitted synthetic source${provenanceNames.size === 1 ? "" : "s"} · architecture validation only.`;

      return {
        capabilityName: capabilityName(model, assessment.capabilityId),
        publishedEvidenceCount: linked.length,
        provenanceSummary,
        assessmentStatusLabel: fitStatusLabelFor(assessment.fit.status),
        gapLabel,
      };
    }),
  );
}

function buildGapIndicators(
  org: OrgResearchRecord,
  evidenceByCapability: readonly CompareCapabilityEvidenceView[],
): readonly string[] {
  const gaps: string[] = [];
  if (org.portfolio.status === "insufficient_evidence") {
    gaps.push(
      "Portfolio assessment has insufficient evidence. Missing capability weight is not negative fit.",
    );
  }
  for (const row of evidenceByCapability) {
    if (
      row.assessmentStatusLabel === fitStatusLabelFor("insufficient_evidence") ||
      row.gapLabel.includes("additional or reviewable evidence")
    ) {
      gaps.push(`${row.capabilityName}: ${row.gapLabel}`);
    }
  }
  return Object.freeze(gaps);
}

function buildOverlayProjection(
  context: AuthorizationContext,
  org: OrgResearchRecord,
  model: TenantResearchReadModel,
): CompareOverlayProjectionView {
  if (!hasPermission(context, "overlay:read")) {
    return { access: "restricted" };
  }
  if (!org.overlay) {
    return {
      access: "omitted",
      summary:
        "No tenant-provided relationship context. Relationship and capability-usage state remain unknown.",
    };
  }
  return {
    access: "available",
    relationshipStatusLabel: label(org.overlay.relationshipStatus),
    matchStatusLabel: label(org.overlay.matchStatus),
    reviewStatusLabel: label(org.overlay.reviewStatus),
    sourceClassificationLabel: label(org.overlay.sourceClassification),
    capabilityUsageLabels: Object.freeze(
      [...org.overlay.capabilityUsage]
        .map((item) => `${capabilityName(model, item.capabilityId)}: ${label(item.usageStatus)}`)
        .sort((a, b) => a.localeCompare(b, "en")),
    ),
  };
}

function buildColumn(
  context: AuthorizationContext,
  model: TenantResearchReadModel,
  org: OrgResearchRecord,
  visibleEvidence: readonly EvidenceRecord[],
  provenanceById: ReadonlyMap<string, ProvenanceRecord>,
): CompareColumnView {
  const warnings: string[] = [];
  if (org.portfolio.status === "insufficient_evidence") {
    warnings.push("Portfolio assessment has insufficient evidence.");
  }
  if (org.portfolio.freshness === "stale") {
    warnings.push("Portfolio assessment includes stale evidence.");
  }
  if (org.portfolio.publicationEligibility !== "eligible") {
    warnings.push("Publication requires review or remains restricted.");
  }
  if (org.excluded) {
    warnings.push("Excluded from default opportunity review.");
  }

  const evidenceByCapability = buildEvidenceByCapability(
    context,
    model,
    org,
    visibleEvidence,
    provenanceById,
  );

  const column: CompareColumnView = {
    displayName: org.displayName,
    detailHref: `/organizations/${org.publicRef}`,
    removeHref: "/compare",
    publicRef: org.publicRef as OrganizationPublicRef,
    organizationType: label(org.organizationType),
    lifecycleStatus: label(org.lifecycleStatus),
    locationLabel: org.locationLabel,
    verticalSummary: org.verticalSummary,
    profileSummary: org.summary,
    assessmentStatusLabel: statusLabel(org.portfolio.status),
    portfolioName: SYNTHETIC_FI_PORTFOLIO.name,
    confidence: org.portfolio.confidence,
    freshness: org.portfolio.freshness,
    assessmentCompleteness: org.portfolio.completeness,
    publicationEligibility: org.portfolio.publicationEligibility,
    opportunityContextStatus: org.opportunityContextStatus,
    opportunityContextLabel: org.opportunityContextLabel,
    capabilities: buildCapabilities(model, org),
    evidenceByCapability,
    gapIndicators: buildGapIndicators(org, evidenceByCapability),
    overlay: buildOverlayProjection(context, org, model),
    warnings: Object.freeze(warnings),
    synthetic: true,
  };
  const score = portfolioScore(org);
  return score ? { ...column, conditionalScore: score } : column;
}

function attachRemoveHrefs(columns: readonly CompareColumnView[]): CompareColumnView[] {
  const refs = columns.map((column) => column.publicRef);
  return columns.map((column) => ({
    ...column,
    removeHref: compareHrefWithout(refs, column.publicRef),
  }));
}

function selectionGuidance(resolvedCount: number, requestedCount: number): string {
  if (resolvedCount === 0 && requestedCount === 0) {
    return `Select ${MIN_COMPARE_ORGS} or ${MAX_COMPARE_ORGS} organizations from Overview, Explorer, or organization detail.`;
  }
  if (resolvedCount < MIN_COMPARE_ORGS) {
    return `Add at least ${MIN_COMPARE_ORGS - resolvedCount} more organization${
      MIN_COMPARE_ORGS - resolvedCount === 1 ? "" : "s"
    } to compare (maximum ${MAX_COMPARE_ORGS}).`;
  }
  if (resolvedCount < MAX_COMPARE_ORGS) {
    return `Comparing ${resolvedCount} organizations. You may add one more (maximum ${MAX_COMPARE_ORGS}).`;
  }
  return `Comparing ${resolvedCount} organizations (maximum reached).`;
}

function differenceState(values: readonly (string | null)[]): CompareDifferenceState {
  if (values.some((value) => value === null)) {
    const present = values.filter((value): value is string => value !== null);
    if (present.length <= 1) return "unavailable";
    return "not_comparable";
  }
  const unique = new Set(values);
  return unique.size === 1 ? "same" : "different";
}

function differenceRow(
  dimensionKey: string,
  dimensionLabel: string,
  cells: readonly { displayName: string; publicRef: OrganizationPublicRef; value: string | null }[],
): CompareDifferenceRowView {
  const state = differenceState(cells.map((cell) => cell.value));
  return {
    dimensionKey,
    dimensionLabel,
    state,
    stateLabel: COMPARE_DIFFERENCE_STATE_LABELS[state],
    cells: Object.freeze(
      cells.map((cell) => ({
        displayName: cell.displayName,
        publicRef: cell.publicRef,
        valueLabel: cell.value ?? "Unavailable",
      })),
    ),
  };
}

function buildDifferences(
  columns: readonly CompareColumnView[],
): readonly CompareDifferenceRowView[] {
  if (columns.length < MIN_COMPARE_ORGS) return Object.freeze([]);

  const rows: CompareDifferenceRowView[] = [];

  rows.push(
    differenceRow(
      "assessment_status",
      "Assessment state",
      columns.map((column) => ({
        displayName: column.displayName,
        publicRef: column.publicRef,
        value: column.assessmentStatusLabel,
      })),
    ),
  );

  rows.push(
    differenceRow(
      "portfolio_band",
      "Conditional portfolio observed-alignment band",
      columns.map((column) => ({
        displayName: column.displayName,
        publicRef: column.publicRef,
        value: column.conditionalScore?.bandLabel ?? null,
      })),
    ),
  );

  for (const key of [
    "confidence",
    "freshness",
    "assessmentCompleteness",
    "publicationEligibility",
  ] as const) {
    const labels: Record<typeof key, string> = {
      confidence: "Confidence",
      freshness: "Freshness",
      assessmentCompleteness: "Assessment completeness",
      publicationEligibility: "Publication eligibility",
    };
    rows.push(
      differenceRow(
        key,
        labels[key],
        columns.map((column) => ({
          displayName: column.displayName,
          publicRef: column.publicRef,
          value: label(column[key]),
        })),
      ),
    );
  }

  rows.push(
    differenceRow(
      "opportunity_context",
      "Synthetic opportunity context",
      columns.map((column) => ({
        displayName: column.displayName,
        publicRef: column.publicRef,
        value: column.opportunityContextLabel,
      })),
    ),
  );

  const capabilityNames = [
    ...new Set(columns.flatMap((column) => column.capabilities.map((item) => item.capabilityName))),
  ].sort((a, b) => a.localeCompare(b, "en"));

  for (const capabilityName of capabilityNames) {
    rows.push(
      differenceRow(
        `capability_status:${capabilityName}`,
        `Capability status · ${capabilityName}`,
        columns.map((column) => {
          const capability = column.capabilities.find(
            (item) => item.capabilityName === capabilityName,
          );
          return {
            displayName: column.displayName,
            publicRef: column.publicRef,
            value: capability?.statusLabel ?? null,
          };
        }),
      ),
    );
    rows.push(
      differenceRow(
        `capability_band:${capabilityName}`,
        `Capability observed-alignment band · ${capabilityName}`,
        columns.map((column) => {
          const capability = column.capabilities.find(
            (item) => item.capabilityName === capabilityName,
          );
          return {
            displayName: column.displayName,
            publicRef: column.publicRef,
            value: capability?.conditionalScore?.bandLabel ?? null,
          };
        }),
      ),
    );
  }

  rows.sort((a, b) => a.dimensionKey.localeCompare(b.dimensionKey, "en"));
  return Object.freeze(rows);
}

/**
 * Build a tenant-scoped comparison page view.
 * Does not recalculate Phase 4 scores. Authorization is checked every call.
 */
export async function buildComparePageView(
  context: AuthorizationContext,
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): Promise<ComparePageView> {
  const parsed = parseCompareSearchParams(searchParams);
  if (!parsed.ok) {
    return baseView({
      state: "malformed",
      stateMessage:
        parsed.reason === "too_many"
          ? `Compare accepts at most ${MAX_COMPARE_ORGS} organizations.`
          : "The comparison selection is malformed. Use opaque organization references only.",
      compareHref: "/compare",
      selectedRefs: Object.freeze([]),
      columns: Object.freeze([]),
      missing: Object.freeze([]),
      selectionGuidance: `Provide two or three valid organization references (maximum ${MAX_COMPARE_ORGS}).`,
      contrastNotes: Object.freeze([]),
    });
  }

  try {
    assertPermission(context, "organization:read");
    assertPermission(context, "assessment:read");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return baseView({
        state: "unauthorized",
        stateMessage: "Comparison requires organization and assessment read permission.",
        compareHref: compareHrefFor(parsed.query.orgRefs),
        selectedRefs: parsed.query.orgRefs,
        columns: Object.freeze([]),
        missing: Object.freeze([]),
        selectionGuidance: "Ask an administrator if you need comparison access.",
        contrastNotes: Object.freeze([]),
      });
    }
    throw error;
  }

  try {
    // Re-assert before projections so mid-request permission loss fails closed.
    assertPermission(context, "organization:read");
    assertPermission(context, "assessment:read");

    const model = getTenantResearchReadModel(context);
    if (model.methodologyVersion !== METHODOLOGY_VERSION) {
      return baseView({
        state: "error",
        stateMessage: "Comparison is unavailable for this methodology version.",
        compareHref: compareHrefFor(parsed.query.orgRefs),
        selectedRefs: parsed.query.orgRefs,
        columns: Object.freeze([]),
        missing: Object.freeze([]),
        selectionGuidance: selectionGuidance(0, parsed.query.orgRefs.length),
        contrastNotes: Object.freeze([]),
      });
    }

    const store = loadFinancialInstitutionsStore();
    const provenanceById = new Map(
      store.provenance
        .filter((item) => item.tenantId === context.tenant.id)
        .map((item) => [item.id, item] as const),
    );

    const columns: CompareColumnView[] = [];
    const missing: CompareMissingSlotView[] = [];

    for (const ref of parsed.query.orgRefs) {
      const org = model.organizations.find((item) => item.publicRef === ref);
      if (!org) {
        missing.push({
          publicRef: ref,
          message: "Organization not found in this tenant research set.",
        });
        continue;
      }
      if (org.adapterVersion !== FINANCIAL_INSTITUTIONS_ADAPTER_VERSION) {
        missing.push({
          publicRef: ref,
          message: "This organization uses an unsupported research model version.",
        });
        continue;
      }

      const orgEvidence = store.evidence.filter(
        (item) => item.tenantId === context.tenant.id && item.organizationId === org.organizationId,
      );
      const visibleEvidence = visibleEvidenceForOrg(context, org, orgEvidence, provenanceById);
      columns.push(buildColumn(context, model, org, visibleEvidence, provenanceById));
    }

    const columnsWithRemoval = attachRemoveHrefs(columns);
    const compareHref = compareHrefFor(columnsWithRemoval.map((column) => column.publicRef));
    const selectedRefs = Object.freeze(columnsWithRemoval.map((column) => column.publicRef));

    if (parsed.query.orgRefs.length === 0) {
      return baseView({
        state: "empty",
        stateMessage: "No organizations selected for comparison.",
        compareHref: "/compare",
        selectedRefs: Object.freeze([]),
        columns: Object.freeze([]),
        missing: Object.freeze([]),
        selectionGuidance: selectionGuidance(0, 0),
        contrastNotes: Object.freeze([]),
      });
    }

    if (columnsWithRemoval.length === 0) {
      return baseView({
        state: "not_found",
        stateMessage: "None of the selected organization references could be resolved.",
        compareHref: "/compare",
        selectedRefs: Object.freeze([]),
        columns: Object.freeze([]),
        missing: Object.freeze(missing),
        selectionGuidance: selectionGuidance(0, parsed.query.orgRefs.length),
        contrastNotes: Object.freeze([]),
      });
    }

    if (columnsWithRemoval.length < MIN_COMPARE_ORGS) {
      return baseView({
        state: "partial",
        stateMessage: "Select at least one more organization to compare.",
        compareHref,
        selectedRefs,
        columns: Object.freeze(columnsWithRemoval),
        missing: Object.freeze(missing),
        selectionGuidance: selectionGuidance(
          columnsWithRemoval.length,
          parsed.query.orgRefs.length,
        ),
        differences: Object.freeze([]),
        contrastNotes: Object.freeze([]),
      });
    }

    const differences = buildDifferences(columnsWithRemoval);
    return baseView({
      state: "ready",
      stateMessage: `Comparing ${columnsWithRemoval.length} synthetic organizations side by side.`,
      compareHref,
      selectedRefs,
      columns: Object.freeze(columnsWithRemoval),
      missing: Object.freeze(missing),
      selectionGuidance: selectionGuidance(columnsWithRemoval.length, parsed.query.orgRefs.length),
      differences,
      contrastNotes: Object.freeze([
        "Contrast rows use fixed labels for same, different, unavailable, and not-comparable published values. No organization is ranked as a winner.",
      ]),
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return baseView({
        state: "unauthorized",
        stateMessage: "Comparison requires organization and assessment read permission.",
        compareHref: compareHrefFor(parsed.query.orgRefs),
        selectedRefs: parsed.query.orgRefs,
        columns: Object.freeze([]),
        missing: Object.freeze([]),
        selectionGuidance: "Ask an administrator if you need comparison access.",
        contrastNotes: Object.freeze([]),
      });
    }
    return baseView({
      state: "error",
      stateMessage: "Comparison could not be built for this request.",
      compareHref: compareHrefFor(parsed.query.orgRefs),
      selectedRefs: parsed.query.orgRefs,
      columns: Object.freeze([]),
      missing: Object.freeze([]),
      selectionGuidance: selectionGuidance(0, parsed.query.orgRefs.length),
      contrastNotes: Object.freeze([]),
    });
  }
}
