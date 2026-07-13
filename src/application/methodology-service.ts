import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { assertPermission } from "@/authorization/context";
import { AuthorizationError } from "@/domain/errors";
import { DOMAIN_SCHEMA_VERSION } from "@/domain/ids";
import { ENGINE_VERSION } from "@/domain/assessments/quality";
import { ASSESSMENT_HEURISTIC_DISCLAIMER } from "@/application/assessment-view-models";
import type {
  MethodologyCapabilityView,
  MethodologyPageView,
  MethodologyRuleView,
} from "@/application/methodology-view-models";
import { FINANCIAL_INSTITUTION_CAPABILITIES } from "@/verticals/financial-institutions/capabilities";
import { FINANCIAL_INSTITUTION_RULE_SETS } from "@/verticals/financial-institutions/assessment/rules";
import { SYNTHETIC_FI_PORTFOLIO } from "@/verticals/financial-institutions/assessment/synthetic-portfolio";
import { METHODOLOGY_MANIFEST } from "@/verticals/financial-institutions/assessment/methodology";
import {
  DATASET_DECLARATION,
  FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
} from "@/verticals/financial-institutions/schema";
import { FINANCIAL_INSTITUTIONS_VOCABULARY } from "@/verticals/financial-institutions/vocabulary";

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    if (child && typeof child === "object" && !Object.isFrozen(child)) deepFreeze(child);
  }
  return value;
}

function label(value: string): string {
  const vocab = FINANCIAL_INSTITUTIONS_VOCABULARY as Record<string, string>;
  return vocab[value] ?? value.replace(/_/g, " ");
}

function emptyView(state: MethodologyPageView["state"], stateMessage: string): MethodologyPageView {
  return {
    state,
    stateMessage,
    verticalLabel: "Financial institutions",
    syntheticNotice: DATASET_DECLARATION,
    heuristicDisclaimer: ASSESSMENT_HEURISTIC_DISCLAIMER,
    manifest: {
      engineVersion: ENGINE_VERSION,
      domainSchemaVersion: DOMAIN_SCHEMA_VERSION,
      adapterVersion: FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
      methodologyVersion: METHODOLOGY_MANIFEST.methodologyVersion,
      catalogVersion: METHODOLOGY_MANIFEST.catalogVersion,
      portfolioVersion: METHODOLOGY_MANIFEST.portfolioVersion,
      overlaySetVersion: METHODOLOGY_MANIFEST.overlaySetVersion,
      assessedAt: METHODOLOGY_MANIFEST.assessedAt,
      synthetic: true,
    },
    capabilities: [],
    thresholds: { bandThresholds: [], confidenceThresholds: [] },
    policies: {
      completenessPolicy: [],
      aggregationPolicy: [],
      confidencePolicy: [],
      freshnessPolicy: [],
      conditionalScoreBehavior: "",
      opportunityRulesSummary: "",
      publicationPolicy: [],
      humanReviewRequirement: "",
    },
    disclaimers: [ASSESSMENT_HEURISTIC_DISCLAIMER],
  };
}

function evidenceRequirementsFor(
  rule: (typeof FINANCIAL_INSTITUTION_RULE_SETS)[number]["rules"][number],
) {
  const types = rule.evidenceRequirements.requiredEvidenceTypes;
  if (types.length === 0) return ["No specific evidence type required beyond validated inputs."];
  return types.map(label);
}

function safeMethodologyNotes(value: string): string {
  return value
    .replace(/\bpredicate\b/gi, "condition")
    .replace(/\ballowStale false\b/gi, "stale evidence is not allowed")
    .replace(/\bassessedAt\b/g, "assessment timestamp");
}

function ruleView(
  rule: (typeof FINANCIAL_INSTITUTION_RULE_SETS)[number]["rules"][number],
): MethodologyRuleView {
  return {
    title: rule.title,
    factorCategoryLabel: label(rule.factorCategory),
    rationale: rule.rationale,
    maximumPoints: rule.maximumPoints,
    evidenceRequirements: Object.freeze(evidenceRequirementsFor(rule)),
    requiresValidatedProvenance: rule.evidenceRequirements.requireValidatedProvenance,
    missingEvidencePolicy:
      "Missing required evidence is not evaluated and does not count as negative alignment.",
    staleEvidencePolicy:
      rule.staleEvidenceBehavior === "allow_if_declared"
        ? "Stale evidence may be allowed only when declared by the rule."
        : "Stale evidence does not award this rule.",
    restrictedEvidencePolicy:
      rule.restrictedEvidenceBehavior === "allow_internal_only"
        ? "Restricted evidence may support internal review only."
        : "Restricted evidence does not award this rule.",
    methodologyNotes: safeMethodologyNotes(rule.methodologyNotes),
    enabled: rule.enabled,
  };
}

function buildCapabilities(): readonly MethodologyCapabilityView[] {
  return Object.freeze(
    SYNTHETIC_FI_PORTFOLIO.capabilities
      .filter((cap) => cap.status === "enabled")
      .map((portfolioCap) => {
        const capability = FINANCIAL_INSTITUTION_CAPABILITIES.find(
          (item) => item.id === portfolioCap.capabilityId,
        );
        const ruleSet = FINANCIAL_INSTITUTION_RULE_SETS.find(
          (item) => item.capabilityId === portfolioCap.capabilityId,
        );
        if (!capability || !ruleSet) {
          throw new Error("Methodology capability is not aligned with rule sets.");
        }
        const rules = Object.freeze(ruleSet.rules.map(ruleView));
        return {
          name: capability.name,
          description: capability.description,
          category: capability.category,
          priority: portfolioCap.priority,
          rulePointTotal: rules.reduce((sum, rule) => sum + rule.maximumPoints, 0),
          declaredMaximumPoints: ruleSet.declaredMaximumPoints,
          requiredGates: Object.freeze(
            ruleSet.requiredGates.map((gate) => ({
              description: gate.description,
              requiredEvidenceTypes: Object.freeze(gate.requiredEvidenceTypes.map(label)),
            })),
          ),
          rules,
        };
      }),
  );
}

function bandThresholds() {
  const thresholds = METHODOLOGY_MANIFEST.bandThresholds;
  return Object.freeze([
    {
      label: "Limited observed alignment",
      min: thresholds.limited_observed_alignment.min,
      max: thresholds.limited_observed_alignment.max,
    },
    {
      label: "Emerging observed alignment",
      min: thresholds.emerging_observed_alignment.min,
      max: thresholds.emerging_observed_alignment.max,
    },
    {
      label: "Meaningful observed alignment",
      min: thresholds.meaningful_observed_alignment.min,
      max: thresholds.meaningful_observed_alignment.max,
    },
    {
      label: "Strong observed alignment",
      min: thresholds.strong_observed_alignment.min,
      max: thresholds.strong_observed_alignment.max,
    },
  ]);
}

export async function buildMethodologyPageView(
  context: AuthorizationContext,
  requestedVersion: string = METHODOLOGY_MANIFEST.methodologyVersion,
): Promise<MethodologyPageView> {
  try {
    assertPermission(context, "methodology:read");
    if (requestedVersion !== METHODOLOGY_MANIFEST.methodologyVersion) {
      return deepFreeze(
        emptyView("unavailable", "The requested methodology version is not supported."),
      );
    }
    const view: MethodologyPageView = {
      state: "ready",
      verticalLabel: "Financial institutions",
      syntheticNotice: DATASET_DECLARATION,
      heuristicDisclaimer: ASSESSMENT_HEURISTIC_DISCLAIMER,
      manifest: {
        engineVersion: ENGINE_VERSION,
        domainSchemaVersion: DOMAIN_SCHEMA_VERSION,
        adapterVersion: FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
        methodologyVersion: METHODOLOGY_MANIFEST.methodologyVersion,
        catalogVersion: METHODOLOGY_MANIFEST.catalogVersion,
        portfolioVersion: METHODOLOGY_MANIFEST.portfolioVersion,
        overlaySetVersion: METHODOLOGY_MANIFEST.overlaySetVersion,
        assessedAt: METHODOLOGY_MANIFEST.assessedAt,
        synthetic: true,
      },
      capabilities: buildCapabilities(),
      thresholds: {
        bandThresholds: bandThresholds(),
        confidenceThresholds: Object.freeze([
          {
            label: "High confidence minimum support ratio",
            value: METHODOLOGY_MANIFEST.confidenceThresholds.highMinSupportRatio,
          },
          {
            label: "Moderate confidence minimum support ratio",
            value: METHODOLOGY_MANIFEST.confidenceThresholds.moderateMinSupportRatio,
          },
          {
            label: "Unresolved required evidence forces low confidence",
            value: String(METHODOLOGY_MANIFEST.confidenceThresholds.unresolvedRequiredForcesLow),
          },
        ]),
      },
      policies: {
        completenessPolicy: Object.freeze([
          "Required gates must be satisfied before assessed results are published.",
          "Partial completeness is used when evaluated points are below declared maximum points.",
          "Invalid inputs yield insufficient evidence rather than fabricated scores.",
        ]),
        aggregationPolicy: Object.freeze([
          `Aggregation kind: ${SYNTHETIC_FI_PORTFOLIO.aggregationPolicy.kind.replace(/_/g, " ")}.`,
          `Minimum assessed capability ratio: ${SYNTHETIC_FI_PORTFOLIO.aggregationPolicy.minAssessedCapabilityRatio}.`,
          `Insufficient portfolio ratio: ${SYNTHETIC_FI_PORTFOLIO.aggregationPolicy.insufficientPortfolioRatio}.`,
        ]),
        confidencePolicy: Object.freeze([
          `High confidence requires at least ${METHODOLOGY_MANIFEST.confidenceThresholds.highMinSupportRatio} support ratio.`,
          `Moderate confidence requires at least ${METHODOLOGY_MANIFEST.confidenceThresholds.moderateMinSupportRatio} support ratio.`,
          "Unresolved required evidence forces low confidence.",
        ]),
        freshnessPolicy: Object.freeze([
          "Fresh evidence may support eligible rule outcomes.",
          "Stale evidence follows each executable rule's declared stale-evidence behavior.",
          "Unknown freshness remains unknown and is never converted to current.",
        ]),
        conditionalScoreBehavior:
          "Portfolio scores are conditional on assessed capabilities. Missing capability weight is excluded from the denominator and is not negative fit.",
        opportunityRulesSummary:
          "Tenant overlays can label opportunity context; they never alter fit points or assessment bands.",
        publicationPolicy: Object.freeze([
          "Publication eligibility is derived from evidence and ledger rows.",
          "Restricted evidence may require elevated evidence permission before details are shown.",
          "Methodology text omits raw rule logic and internal rule identifiers.",
        ]),
        humanReviewRequirement:
          "Human judgment is required before any prioritization or publication decision.",
      },
      disclaimers: Object.freeze([
        ASSESSMENT_HEURISTIC_DISCLAIMER,
        "Observed alignment bands are deterministic heuristic labels, not forecasts or intent claims.",
        "Synthetic capabilities and evidence exist only for architecture validation.",
      ]),
    };
    return deepFreeze(view);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return deepFreeze(emptyView("unauthorized", "This workspace cannot load the methodology."));
    }
    return deepFreeze(emptyView("error", "The synthetic methodology is temporarily unavailable."));
  }
}
