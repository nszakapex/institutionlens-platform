import "server-only";

import type { CapabilityId } from "@/domain/ids";
import type {
  AssessmentRule,
  EvidenceRequirements,
  FactorCategory,
  RuleSet,
} from "@/domain/assessments/rules";
import { RuleSetSchema } from "@/domain/assessments/rules";
import type { Predicate } from "@/domain/assessments/predicates";
import type { EvidenceType } from "@/domain/schemas/evidence";
import { FINANCIAL_INSTITUTIONS_VERTICAL_ID } from "@/verticals/financial-institutions/schema";
import { METHODOLOGY_VERSION } from "@/verticals/financial-institutions/assessment/methodology";

const VERSION = "1.0.0" as const;

type RuleSeed = {
  ruleId: string;
  ruleSetId: string;
  capabilityId: string;
  factorCategory: FactorCategory;
  title: string;
  rationale: string;
  maximumPoints: number;
  predicate: Predicate;
  evidenceRequirements: EvidenceRequirements;
  methodologyNotes: string;
  missingEvidenceBehavior?: "not_evaluated_missing";
  staleEvidenceBehavior?: "not_evaluated_stale" | "allow_if_declared";
  restrictedEvidenceBehavior?: "not_evaluated_restricted" | "allow_internal_only";
};

function defaultEvidence(overrides: Partial<EvidenceRequirements> = {}): EvidenceRequirements {
  return {
    requiredEvidenceTypes: [],
    requireValidatedProvenance: false,
    allowStale: false,
    allowRestrictedInternal: false,
    allowInference: false,
    ...overrides,
  };
}

function profileEvidence(types: EvidenceType[] = ["organization_profile"]): EvidenceRequirements {
  return defaultEvidence({
    requiredEvidenceTypes: types,
    requireValidatedProvenance: true,
  });
}

function buildRule(seed: RuleSeed): AssessmentRule {
  return {
    ruleId: seed.ruleId,
    ruleSetId: seed.ruleSetId,
    ruleSetVersion: VERSION,
    verticalId: FINANCIAL_INSTITUTIONS_VERTICAL_ID,
    capabilityId: seed.capabilityId,
    factorCategory: seed.factorCategory,
    title: seed.title,
    rationale: seed.rationale,
    maximumPoints: seed.maximumPoints,
    evidenceRequirements: seed.evidenceRequirements,
    predicate: seed.predicate,
    missingEvidenceBehavior: seed.missingEvidenceBehavior ?? "not_evaluated_missing",
    staleEvidenceBehavior: seed.staleEvidenceBehavior ?? "not_evaluated_stale",
    restrictedEvidenceBehavior: seed.restrictedEvidenceBehavior ?? "not_evaluated_restricted",
    publicationPolicy: { impact: "derived_from_evidence" },
    enabled: true,
    methodologyNotes: seed.methodologyNotes,
    synthetic: true,
  };
}

function parseRuleSet(raw: {
  id: string;
  capabilityId: string;
  rules: AssessmentRule[];
  requiredGates: RuleSet["requiredGates"];
}): RuleSet {
  return RuleSetSchema.parse({
    id: raw.id,
    version: VERSION,
    verticalId: FINANCIAL_INSTITUTIONS_VERTICAL_ID,
    capabilityId: raw.capabilityId,
    declaredMaximumPoints: 100,
    rules: raw.rules,
    requiredGates: raw.requiredGates,
    enabled: true,
    synthetic: true,
    methodologyVersion: METHODOLOGY_VERSION,
  });
}

const OPS_ID = "cap_syn_fi_ops_analytics";
const OPS_SET = "ruleset_syn_fi_ops_analytics";

const DQ_ID = "cap_syn_fi_data_quality";
const DQ_SET = "ruleset_syn_fi_data_quality";

const PR_ID = "cap_syn_fi_portfolio_reporting";
const PR_SET = "ruleset_syn_fi_portfolio_reporting";

const SP_ID = "cap_syn_fi_scenario_planning";
const SP_SET = "ruleset_syn_fi_scenario_planning";

const GOV_ID = "cap_syn_fi_governance_review";
const GOV_SET = "ruleset_syn_fi_governance_review";

const opsAnalyticsRuleSet = parseRuleSet({
  id: OPS_SET,
  capabilityId: OPS_ID,
  requiredGates: [
    {
      gateId: "gate_ops_organization_profile",
      description: "Operational analytics requires a usable organization profile observation.",
      requiredEvidenceTypes: ["organization_profile"],
    },
  ],
  rules: [
    buildRule({
      ruleId: "rule_syn_fi_ops_profile_kind",
      ruleSetId: OPS_SET,
      capabilityId: OPS_ID,
      factorCategory: "organizational_profile_fit",
      title: "Institution kind fits operational analytics demo scope",
      rationale:
        "Synthetic banks and credit unions are in-scope shapes for the operational analytics capability.",
      maximumPoints: 20,
      evidenceRequirements: profileEvidence(),
      methodologyNotes: "Independent synthetic profile-kind gate for ops analytics.",
      predicate: {
        type: "all",
        predicates: [
          {
            type: "category_in",
            field: "institution_kind",
            values: ["synthetic_bank", "synthetic_credit_union"],
          },
          {
            type: "evidence_exists",
            evidenceTypes: ["organization_profile"],
            minCount: 1,
          },
        ],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_ops_scale",
      ruleSetId: OPS_SET,
      capabilityId: OPS_ID,
      factorCategory: "organizational_profile_fit",
      title: "Balance-sheet scale supports operational analytics",
      rationale:
        "Mid-to-extra-large synthetic scale bands benefit from operational analytics themes.",
      maximumPoints: 15,
      evidenceRequirements: defaultEvidence(),
      methodologyNotes:
        "Scale band field-only rule; predicate still references allowlisted fields.",
      predicate: {
        type: "category_in",
        field: "balance_sheet_scale_band",
        values: ["band_m", "band_l", "band_xl"],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_ops_digital",
      ruleSetId: OPS_SET,
      capabilityId: OPS_ID,
      factorCategory: "capability_alignment",
      title: "Digital service maturity aligns with analytics workflows",
      rationale:
        "Developing or established digital maturity aligns with operational analytics support.",
      maximumPoints: 20,
      evidenceRequirements: defaultEvidence(),
      methodologyNotes: "Digital maturity alignment for ops analytics.",
      predicate: {
        type: "category_in",
        field: "digital_service_maturity",
        values: ["developing", "established"],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_ops_complexity",
      ruleSetId: OPS_SET,
      capabilityId: OPS_ID,
      factorCategory: "operational_compatibility",
      title: "Operating complexity warrants analytics support",
      rationale: "Moderate or high operating complexity is a stronger synthetic fit for analytics.",
      maximumPoints: 15,
      evidenceRequirements: defaultEvidence(),
      methodologyNotes: "Complexity band compatibility for ops analytics.",
      predicate: {
        type: "category_in",
        field: "operating_complexity_band",
        values: ["moderate", "high"],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_ops_timing",
      ruleSetId: OPS_SET,
      capabilityId: OPS_ID,
      factorCategory: "timing_change_signals",
      title: "Recent public change signal supports timing",
      rationale: "A recent synthetic public change signal strengthens timing relevance.",
      maximumPoints: 20,
      evidenceRequirements: defaultEvidence({
        requiredEvidenceTypes: ["public_change_signal"],
        requireValidatedProvenance: true,
      }),
      methodologyNotes: "Timing rule requires change evidence within 180 days of assessedAt.",
      predicate: {
        type: "all",
        predicates: [
          {
            type: "boolean_equals",
            field: "has_public_change_signal",
            value: true,
          },
          {
            type: "date_within_period",
            field: "latest_public_change_date",
            withinDays: 180,
          },
          {
            type: "evidence_exists",
            evidenceTypes: ["public_change_signal"],
            minCount: 1,
          },
        ],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_ops_fresh",
      ruleSetId: OPS_SET,
      capabilityId: OPS_ID,
      factorCategory: "publicly_evidenced_need",
      title: "Organization profile freshness is usable",
      rationale: "Current or aging profile freshness is required; stale evidence is not awarded.",
      maximumPoints: 10,
      evidenceRequirements: profileEvidence(),
      methodologyNotes: "Freshness gate with allowStale false (default).",
      predicate: {
        type: "freshness_is",
        evidenceTypes: ["organization_profile"],
        statuses: ["current", "aging"],
      },
    }),
  ],
});

const dataQualityRuleSet = parseRuleSet({
  id: DQ_SET,
  capabilityId: DQ_ID,
  requiredGates: [
    {
      gateId: "gate_dq_organization_profile",
      description: "Data-quality modernization requires an organization profile observation.",
      requiredEvidenceTypes: ["organization_profile"],
    },
  ],
  rules: [
    buildRule({
      ruleId: "rule_syn_fi_dq_profile",
      ruleSetId: DQ_SET,
      capabilityId: DQ_ID,
      factorCategory: "organizational_profile_fit",
      title: "Profile evidence supports data-quality review",
      rationale:
        "Verified synthetic institution kinds are eligible for data-quality modernization themes.",
      maximumPoints: 18,
      evidenceRequirements: profileEvidence(),
      methodologyNotes: "Profile presence and kind for data-quality capability.",
      predicate: {
        type: "all",
        predicates: [
          {
            type: "category_in",
            field: "institution_kind",
            values: ["synthetic_bank", "synthetic_credit_union"],
          },
          {
            type: "evidence_exists",
            evidenceTypes: ["organization_profile"],
          },
        ],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_dq_availability",
      ruleSetId: DQ_SET,
      capabilityId: DQ_ID,
      factorCategory: "publicly_evidenced_need",
      title: "Data availability indicates modernization opportunity",
      rationale:
        "Abundant or moderate synthetic data availability signals modernization relevance.",
      maximumPoints: 25,
      evidenceRequirements: defaultEvidence(),
      methodologyNotes: "Primary data-availability alignment rule.",
      predicate: {
        type: "category_in",
        field: "regulatory_data_availability",
        values: ["abundant_synthetic", "moderate_synthetic"],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_dq_ownership",
      ruleSetId: DQ_SET,
      capabilityId: DQ_ID,
      factorCategory: "capability_alignment",
      title: "Ownership model aligns with data-quality workflows",
      rationale:
        "Cooperative and stock-like synthetic ownership models fit the demo data-quality theme.",
      maximumPoints: 15,
      evidenceRequirements: defaultEvidence(),
      methodologyNotes: "Ownership model alignment for data quality.",
      predicate: {
        type: "category_in",
        field: "ownership_model",
        values: ["synthetic_cooperative", "synthetic_stock"],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_dq_lending",
      ruleSetId: DQ_SET,
      capabilityId: DQ_ID,
      factorCategory: "capability_alignment",
      title: "Lending breadth supports data-quality themes",
      rationale: "Moderate or broad lending breadth increases synthetic data-quality alignment.",
      maximumPoints: 17,
      evidenceRequirements: defaultEvidence(),
      methodologyNotes: "Lending breadth field rule.",
      predicate: {
        type: "category_in",
        field: "lending_breadth",
        values: ["moderate", "broad"],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_dq_scale",
      ruleSetId: DQ_SET,
      capabilityId: DQ_ID,
      factorCategory: "operational_compatibility",
      title: "Larger scale benefits from data-quality modernization",
      rationale:
        "Large and extra-large scale bands are stronger synthetic fits for data-quality work.",
      maximumPoints: 15,
      evidenceRequirements: defaultEvidence(),
      methodologyNotes: "Scale preference for data-quality capability.",
      predicate: {
        type: "category_in",
        field: "balance_sheet_scale_band",
        values: ["band_l", "band_xl"],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_dq_fresh",
      ruleSetId: DQ_SET,
      capabilityId: DQ_ID,
      factorCategory: "publicly_evidenced_need",
      title: "Profile freshness supports data-quality scoring",
      rationale: "Only current or aging profile freshness may award this rule.",
      maximumPoints: 10,
      evidenceRequirements: profileEvidence(),
      methodologyNotes: "Freshness rule with allowStale false.",
      predicate: {
        type: "freshness_is",
        evidenceTypes: ["organization_profile"],
        statuses: ["current", "aging"],
      },
    }),
  ],
});

const portfolioReportingRuleSet = parseRuleSet({
  id: PR_SET,
  capabilityId: PR_ID,
  requiredGates: [
    {
      gateId: "gate_pr_operating_context",
      description: "Portfolio reporting prefers operating-context evidence when available.",
      requiredEvidenceTypes: ["operating_context"],
    },
  ],
  rules: [
    buildRule({
      ruleId: "rule_syn_fi_pr_profile",
      ruleSetId: PR_SET,
      capabilityId: PR_ID,
      factorCategory: "organizational_profile_fit",
      title: "Institution profile supports portfolio reporting",
      rationale:
        "In-scope institution kinds with profile evidence fit portfolio reporting workflows.",
      maximumPoints: 20,
      evidenceRequirements: profileEvidence(),
      methodologyNotes: "Profile kind rule for portfolio reporting.",
      predicate: {
        type: "all",
        predicates: [
          {
            type: "category_in",
            field: "institution_kind",
            values: ["synthetic_bank", "synthetic_credit_union"],
          },
          {
            type: "evidence_exists",
            evidenceTypes: ["organization_profile"],
          },
        ],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_pr_scale",
      ruleSetId: PR_SET,
      capabilityId: PR_ID,
      factorCategory: "organizational_profile_fit",
      title: "Scale band supports portfolio reporting needs",
      rationale: "Mid-to-extra-large scale bands typically need structured portfolio reporting.",
      maximumPoints: 20,
      evidenceRequirements: defaultEvidence(),
      methodologyNotes: "Scale alignment for portfolio reporting.",
      predicate: {
        type: "category_in",
        field: "balance_sheet_scale_band",
        values: ["band_m", "band_l", "band_xl"],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_pr_regions",
      ruleSetId: PR_SET,
      capabilityId: PR_ID,
      factorCategory: "operational_compatibility",
      title: "Multi-region footprint increases reporting relevance",
      rationale: "Two or more operating regions increase synthetic portfolio reporting alignment.",
      maximumPoints: 15,
      evidenceRequirements: defaultEvidence(),
      methodologyNotes: "Region-count integer rule.",
      predicate: {
        type: "integer_between",
        field: "operating_region_count",
        min: 2,
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_pr_complexity",
      ruleSetId: PR_SET,
      capabilityId: PR_ID,
      factorCategory: "operational_compatibility",
      title: "Operating complexity supports reporting workflows",
      rationale: "Moderate or high complexity aligns with portfolio reporting support themes.",
      maximumPoints: 15,
      evidenceRequirements: defaultEvidence(),
      methodologyNotes: "Complexity compatibility for portfolio reporting.",
      predicate: {
        type: "category_in",
        field: "operating_complexity_band",
        values: ["moderate", "high"],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_pr_digital",
      ruleSetId: PR_SET,
      capabilityId: PR_ID,
      factorCategory: "capability_alignment",
      title: "Digital maturity aligns with reporting delivery",
      rationale: "Developing or established digital maturity supports reporting workflow themes.",
      maximumPoints: 20,
      evidenceRequirements: defaultEvidence(),
      methodologyNotes: "Digital maturity for portfolio reporting.",
      predicate: {
        type: "category_in",
        field: "digital_service_maturity",
        values: ["developing", "established"],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_pr_context",
      ruleSetId: PR_SET,
      capabilityId: PR_ID,
      factorCategory: "publicly_evidenced_need",
      title: "Operating context evidence is present",
      rationale: "Operating-context evidence strengthens portfolio reporting completeness.",
      maximumPoints: 10,
      evidenceRequirements: defaultEvidence({
        requiredEvidenceTypes: ["operating_context"],
        requireValidatedProvenance: true,
      }),
      methodologyNotes: "Requires operating_context evidence; allowStale false.",
      predicate: {
        type: "evidence_exists",
        evidenceTypes: ["operating_context"],
        minCount: 1,
      },
    }),
  ],
});

const scenarioPlanningRuleSet = parseRuleSet({
  id: SP_SET,
  capabilityId: SP_ID,
  requiredGates: [
    {
      gateId: "gate_sp_organization_profile",
      description: "Scenario planning requires an organization profile observation.",
      requiredEvidenceTypes: ["organization_profile"],
    },
  ],
  rules: [
    buildRule({
      ruleId: "rule_syn_fi_sp_kind",
      ruleSetId: SP_SET,
      capabilityId: SP_ID,
      factorCategory: "organizational_profile_fit",
      title: "Institution kind fits scenario-planning scope",
      rationale:
        "Synthetic banks and credit unions are eligible for scenario-planning support themes.",
      maximumPoints: 15,
      evidenceRequirements: profileEvidence(),
      methodologyNotes: "Kind + profile evidence for scenario planning.",
      predicate: {
        type: "all",
        predicates: [
          {
            type: "category_in",
            field: "institution_kind",
            values: ["synthetic_bank", "synthetic_credit_union"],
          },
          {
            type: "evidence_exists",
            evidenceTypes: ["organization_profile"],
          },
        ],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_sp_complexity",
      ruleSetId: SP_SET,
      capabilityId: SP_ID,
      factorCategory: "operational_compatibility",
      title: "Higher complexity strengthens scenario-planning fit",
      rationale: "High operating complexity is the strongest synthetic fit for scenario planning.",
      maximumPoints: 25,
      evidenceRequirements: defaultEvidence(),
      methodologyNotes: "Emphasizes high complexity for scenario planning variety.",
      predicate: {
        type: "category_equals",
        field: "operating_complexity_band",
        value: "high",
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_sp_digital",
      ruleSetId: SP_SET,
      capabilityId: SP_ID,
      factorCategory: "capability_alignment",
      title: "Digital maturity supports scenario workflows",
      rationale: "Established digital maturity aligns with scenario-planning support.",
      maximumPoints: 15,
      evidenceRequirements: defaultEvidence(),
      methodologyNotes: "Prefers established digital maturity.",
      predicate: {
        type: "category_equals",
        field: "digital_service_maturity",
        value: "established",
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_sp_timing",
      ruleSetId: SP_SET,
      capabilityId: SP_ID,
      factorCategory: "timing_change_signals",
      title: "Change signals within planning window",
      rationale: "A public change signal within 365 days supports scenario-planning timing.",
      maximumPoints: 20,
      evidenceRequirements: defaultEvidence({
        requiredEvidenceTypes: ["public_change_signal"],
        requireValidatedProvenance: true,
      }),
      methodologyNotes: "Wider timing window than ops analytics for variety.",
      predicate: {
        type: "all",
        predicates: [
          {
            type: "boolean_equals",
            field: "has_public_change_signal",
            value: true,
          },
          {
            type: "date_within_period",
            field: "latest_public_change_date",
            withinDays: 365,
          },
          {
            type: "evidence_exists",
            evidenceTypes: ["public_change_signal"],
          },
        ],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_sp_breadth",
      ruleSetId: SP_SET,
      capabilityId: SP_ID,
      factorCategory: "capability_alignment",
      title: "Lending breadth supports scenario themes",
      rationale: "Moderate or broad lending breadth increases scenario-planning alignment.",
      maximumPoints: 15,
      evidenceRequirements: defaultEvidence(),
      methodologyNotes: "Lending breadth for scenario planning.",
      predicate: {
        type: "category_in",
        field: "lending_breadth",
        values: ["moderate", "broad"],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_sp_fresh",
      ruleSetId: SP_SET,
      capabilityId: SP_ID,
      factorCategory: "publicly_evidenced_need",
      title: "Profile freshness supports scenario scoring",
      rationale: "Current or aging freshness is required; stale evidence is not awarded.",
      maximumPoints: 10,
      evidenceRequirements: profileEvidence(),
      methodologyNotes: "Freshness with allowStale false.",
      predicate: {
        type: "freshness_is",
        evidenceTypes: ["organization_profile"],
        statuses: ["current", "aging"],
      },
    }),
  ],
});

const governanceReviewRuleSet = parseRuleSet({
  id: GOV_SET,
  capabilityId: GOV_ID,
  requiredGates: [
    {
      gateId: "gate_gov_organization_profile",
      description: "Governance review requires an organization profile observation.",
      requiredEvidenceTypes: ["organization_profile"],
    },
  ],
  rules: [
    buildRule({
      ruleId: "rule_syn_fi_gov_profile",
      ruleSetId: GOV_SET,
      capabilityId: GOV_ID,
      factorCategory: "organizational_profile_fit",
      title: "Profile evidence supports governance review",
      rationale: "In-scope institution kinds with profile evidence fit governance process review.",
      maximumPoints: 20,
      evidenceRequirements: profileEvidence(),
      methodologyNotes: "Profile kind for governance capability.",
      predicate: {
        type: "any",
        predicates: [
          {
            type: "all",
            predicates: [
              {
                type: "category_in",
                field: "institution_kind",
                values: ["synthetic_bank", "synthetic_credit_union"],
              },
              {
                type: "evidence_exists",
                evidenceTypes: ["organization_profile"],
              },
            ],
          },
          {
            type: "evidence_exists",
            evidenceTypes: ["data_availability"],
          },
        ],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_gov_ownership",
      ruleSetId: GOV_SET,
      capabilityId: GOV_ID,
      factorCategory: "capability_alignment",
      title: "Ownership model aligns with governance themes",
      rationale: "Cooperative and mutual ownership models align with governance review themes.",
      maximumPoints: 20,
      evidenceRequirements: defaultEvidence(),
      methodologyNotes: "Ownership preference for governance.",
      predicate: {
        type: "category_in",
        field: "ownership_model",
        values: ["synthetic_cooperative", "synthetic_mutual"],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_gov_availability",
      ruleSetId: GOV_SET,
      capabilityId: GOV_ID,
      factorCategory: "publicly_evidenced_need",
      title: "Data availability informs governance review",
      rationale:
        "Sparse or restricted synthetic availability may still inform internal governance review paths.",
      maximumPoints: 20,
      evidenceRequirements: defaultEvidence({
        requiredEvidenceTypes: ["data_availability"],
        allowRestrictedInternal: true,
        requireValidatedProvenance: true,
      }),
      restrictedEvidenceBehavior: "allow_internal_only",
      methodologyNotes:
        "Exercises restricted-internal path; does not grant publication eligibility.",
      predicate: {
        type: "any",
        predicates: [
          {
            type: "category_in",
            field: "regulatory_data_availability",
            values: ["sparse_synthetic", "restricted_synthetic", "moderate_synthetic"],
          },
          {
            type: "evidence_exists",
            evidenceTypes: ["data_availability"],
          },
        ],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_gov_scale",
      ruleSetId: GOV_SET,
      capabilityId: GOV_ID,
      factorCategory: "operational_compatibility",
      title: "Scale band supports governance review",
      rationale: "Mid and large scale bands align with governance process review themes.",
      maximumPoints: 15,
      evidenceRequirements: defaultEvidence(),
      methodologyNotes: "Scale for governance capability.",
      predicate: {
        type: "category_in",
        field: "balance_sheet_scale_band",
        values: ["band_m", "band_l", "band_xl"],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_gov_maturity",
      ruleSetId: GOV_SET,
      capabilityId: GOV_ID,
      factorCategory: "capability_alignment",
      title: "Digital maturity aligns with governance workflows",
      rationale: "Developing or established maturity supports governance process review.",
      maximumPoints: 15,
      evidenceRequirements: defaultEvidence(),
      methodologyNotes: "Digital maturity for governance.",
      predicate: {
        type: "category_in",
        field: "digital_service_maturity",
        values: ["developing", "established"],
      },
    }),
    buildRule({
      ruleId: "rule_syn_fi_gov_fresh",
      ruleSetId: GOV_SET,
      capabilityId: GOV_ID,
      factorCategory: "publicly_evidenced_need",
      title: "Supporting evidence freshness is usable",
      rationale: "Current or aging freshness is required for awarding this governance rule.",
      maximumPoints: 10,
      evidenceRequirements: defaultEvidence({
        requiredEvidenceTypes: ["organization_profile", "data_availability"],
        requireValidatedProvenance: true,
        allowStale: false,
      }),
      methodologyNotes: "Freshness across profile or data-availability evidence; allowStale false.",
      predicate: {
        type: "freshness_is",
        evidenceTypes: ["organization_profile", "data_availability"],
        statuses: ["current", "aging"],
      },
    }),
  ],
});

export const FINANCIAL_INSTITUTION_RULE_SETS: readonly RuleSet[] = Object.freeze([
  opsAnalyticsRuleSet,
  dataQualityRuleSet,
  portfolioReportingRuleSet,
  scenarioPlanningRuleSet,
  governanceReviewRuleSet,
]);

const BY_CAPABILITY = new Map(
  FINANCIAL_INSTITUTION_RULE_SETS.map((ruleSet) => [ruleSet.capabilityId, ruleSet] as const),
);

/**
 * Resolve a rule set by capability ID and exact version.
 * Fail closed when the version does not match — no latest-version fallback.
 */
export function getRuleSet(capabilityId: CapabilityId | string, version: string): RuleSet {
  const ruleSet = BY_CAPABILITY.get(capabilityId);
  if (!ruleSet || ruleSet.version !== version) {
    throw new Error("Requested rule set version is not available.");
  }
  return ruleSet;
}
