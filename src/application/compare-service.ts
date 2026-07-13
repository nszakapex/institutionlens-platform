import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { assertPermission } from "@/authorization/context";
import {
  MAX_COMPARE_ORGS,
  MIN_COMPARE_ORGS,
  compareHrefFor,
  compareHrefWithout,
  parseCompareSearchParams,
} from "@/application/compare-query";
import type {
  CompareCapabilityColumnView,
  CompareColumnView,
  CompareConditionalScoreView,
  CompareMissingSlotView,
  ComparePageView,
} from "@/application/compare-view-models";
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
import {
  FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
  FINANCIAL_INSTITUTIONS_FIXTURE_VERSION,
} from "@/verticals/financial-institutions/schema";
import {
  ASSESSED_AT,
  METHODOLOGY_VERSION,
} from "@/verticals/financial-institutions/assessment/methodology";
import { SYNTHETIC_FI_PORTFOLIO } from "@/verticals/financial-institutions/assessment/synthetic-portfolio";

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

function label(value: string): string {
  return value.replace(/_/g, " ");
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
  partial: Omit<ComparePageView, "manifest"> & { manifest?: ComparePageView["manifest"] },
): ComparePageView {
  return deepFreeze({
    manifest: manifest(),
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

function buildCapabilities(
  model: TenantResearchReadModel,
  org: OrgResearchRecord,
): readonly CompareCapabilityColumnView[] {
  return Object.freeze(
    org.capabilityAssessments.map((assessment) => {
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

function buildColumn(model: TenantResearchReadModel, org: OrgResearchRecord): CompareColumnView {
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
    evidenceCoverageNotes: Object.freeze([]),
    gapNotes: Object.freeze([]),
    overlayNotes: Object.freeze([]),
    differenceNotes: Object.freeze([]),
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
      columns.push(buildColumn(model, org));
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
        selectionGuidance: selectionGuidance(columnsWithRemoval.length, parsed.query.orgRefs.length),
        contrastNotes: Object.freeze([]),
      });
    }

    return baseView({
      state: "ready",
      stateMessage: `Comparing ${columnsWithRemoval.length} synthetic organizations side by side.`,
      compareHref,
      selectedRefs,
      columns: Object.freeze(columnsWithRemoval),
      missing: Object.freeze(missing),
      selectionGuidance: selectionGuidance(columnsWithRemoval.length, parsed.query.orgRefs.length),
      contrastNotes: Object.freeze([
        "Contrast rows highlight differing assessment states and publication constraints. No organization is ranked as a winner.",
      ]),
    });
  } catch {
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
