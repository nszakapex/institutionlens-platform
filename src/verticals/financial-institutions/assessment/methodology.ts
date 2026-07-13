import "server-only";

/**
 * Version pins for the synthetic financial-institutions assessment methodology.
 * Fixed assessedAt keeps synthetic runs deterministic across regenerations.
 */
export const METHODOLOGY_VERSION = "1.0.0" as const;
export const CATALOG_VERSION = "1.0.0" as const;
export const PORTFOLIO_VERSION = "1.0.0" as const;
export const OVERLAY_SET_VERSION = "1.0.0" as const;
export const ASSESSED_AT = "2026-04-01T12:00:00.000Z" as const;

export type MethodologyRuleRef = {
  ruleId: string;
  maximumPoints: number;
  factorCategory: string;
  enabled: boolean;
};

export type MethodologyCapabilityRef = {
  capabilityId: string;
  ruleSetId: string;
  version: string;
  declaredMaximumPoints: number;
  rules: readonly MethodologyRuleRef[];
  requiredGateIds: readonly string[];
};

/**
 * Machine-readable methodology manifest for drift tests.
 * Must stay aligned with `rules.ts` rule IDs, points, and factor categories.
 */
export const METHODOLOGY_MANIFEST = Object.freeze({
  methodologyVersion: METHODOLOGY_VERSION,
  catalogVersion: CATALOG_VERSION,
  portfolioVersion: PORTFOLIO_VERSION,
  overlaySetVersion: OVERLAY_SET_VERSION,
  assessedAt: ASSESSED_AT,
  verticalId: "financial_institutions",
  synthetic: true as const,
  bandThresholds: Object.freeze({
    scale: "0_100" as const,
    limited_observed_alignment: Object.freeze({ min: 0, max: 24 }),
    emerging_observed_alignment: Object.freeze({ min: 25, max: 49 }),
    meaningful_observed_alignment: Object.freeze({ min: 50, max: 74 }),
    strong_observed_alignment: Object.freeze({ min: 75, max: 100 }),
  }),
  confidenceThresholds: Object.freeze({
    highMinSupportRatio: "0.80",
    moderateMinSupportRatio: "0.50",
    lowMinSupportRatio: "0.00",
    unresolvedRequiredForcesLow: true,
  }),
  completenessPolicy: Object.freeze({
    version: "1.0.0",
    requiresGatesSatisfied: true,
    partialWhenEvaluatedBelowDeclared: true,
    invalidInputYieldsInsufficient: true,
  }),
  opportunityRulesSummary: Object.freeze({
    noOverlay: "unknown",
    excluded: "excluded",
    prospect: "new_logo",
    activeClientNotUsed: "cross_sell",
    activeClientActive: "existing_use",
    formerClientOrFormerUsage: "renewal_or_reengagement",
    overlaysNeverAlterFitPoints: true,
  }),
  capabilities: Object.freeze([
    Object.freeze({
      capabilityId: "cap_syn_fi_ops_analytics",
      ruleSetId: "ruleset_syn_fi_ops_analytics",
      version: "1.0.0",
      declaredMaximumPoints: 100,
      requiredGateIds: Object.freeze(["gate_ops_organization_profile"]),
      rules: Object.freeze([
        Object.freeze({
          ruleId: "rule_syn_fi_ops_profile_kind",
          maximumPoints: 20,
          factorCategory: "organizational_profile_fit",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_ops_scale",
          maximumPoints: 15,
          factorCategory: "organizational_profile_fit",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_ops_digital",
          maximumPoints: 20,
          factorCategory: "capability_alignment",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_ops_complexity",
          maximumPoints: 15,
          factorCategory: "operational_compatibility",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_ops_timing",
          maximumPoints: 20,
          factorCategory: "timing_change_signals",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_ops_fresh",
          maximumPoints: 10,
          factorCategory: "publicly_evidenced_need",
          enabled: true,
        }),
      ]),
    } satisfies MethodologyCapabilityRef),
    Object.freeze({
      capabilityId: "cap_syn_fi_data_quality",
      ruleSetId: "ruleset_syn_fi_data_quality",
      version: "1.0.0",
      declaredMaximumPoints: 100,
      requiredGateIds: Object.freeze(["gate_dq_organization_profile"]),
      rules: Object.freeze([
        Object.freeze({
          ruleId: "rule_syn_fi_dq_profile",
          maximumPoints: 18,
          factorCategory: "organizational_profile_fit",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_dq_availability",
          maximumPoints: 25,
          factorCategory: "publicly_evidenced_need",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_dq_ownership",
          maximumPoints: 15,
          factorCategory: "capability_alignment",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_dq_lending",
          maximumPoints: 17,
          factorCategory: "capability_alignment",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_dq_scale",
          maximumPoints: 15,
          factorCategory: "operational_compatibility",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_dq_fresh",
          maximumPoints: 10,
          factorCategory: "publicly_evidenced_need",
          enabled: true,
        }),
      ]),
    } satisfies MethodologyCapabilityRef),
    Object.freeze({
      capabilityId: "cap_syn_fi_portfolio_reporting",
      ruleSetId: "ruleset_syn_fi_portfolio_reporting",
      version: "1.0.0",
      declaredMaximumPoints: 100,
      requiredGateIds: Object.freeze(["gate_pr_operating_context"]),
      rules: Object.freeze([
        Object.freeze({
          ruleId: "rule_syn_fi_pr_profile",
          maximumPoints: 20,
          factorCategory: "organizational_profile_fit",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_pr_scale",
          maximumPoints: 20,
          factorCategory: "organizational_profile_fit",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_pr_regions",
          maximumPoints: 15,
          factorCategory: "operational_compatibility",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_pr_complexity",
          maximumPoints: 15,
          factorCategory: "operational_compatibility",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_pr_digital",
          maximumPoints: 20,
          factorCategory: "capability_alignment",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_pr_context",
          maximumPoints: 10,
          factorCategory: "publicly_evidenced_need",
          enabled: true,
        }),
      ]),
    } satisfies MethodologyCapabilityRef),
    Object.freeze({
      capabilityId: "cap_syn_fi_scenario_planning",
      ruleSetId: "ruleset_syn_fi_scenario_planning",
      version: "1.0.0",
      declaredMaximumPoints: 100,
      requiredGateIds: Object.freeze(["gate_sp_organization_profile"]),
      rules: Object.freeze([
        Object.freeze({
          ruleId: "rule_syn_fi_sp_kind",
          maximumPoints: 15,
          factorCategory: "organizational_profile_fit",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_sp_complexity",
          maximumPoints: 25,
          factorCategory: "operational_compatibility",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_sp_digital",
          maximumPoints: 15,
          factorCategory: "capability_alignment",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_sp_timing",
          maximumPoints: 20,
          factorCategory: "timing_change_signals",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_sp_breadth",
          maximumPoints: 15,
          factorCategory: "capability_alignment",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_sp_fresh",
          maximumPoints: 10,
          factorCategory: "publicly_evidenced_need",
          enabled: true,
        }),
      ]),
    } satisfies MethodologyCapabilityRef),
    Object.freeze({
      capabilityId: "cap_syn_fi_governance_review",
      ruleSetId: "ruleset_syn_fi_governance_review",
      version: "1.0.0",
      declaredMaximumPoints: 100,
      requiredGateIds: Object.freeze(["gate_gov_organization_profile"]),
      rules: Object.freeze([
        Object.freeze({
          ruleId: "rule_syn_fi_gov_profile",
          maximumPoints: 20,
          factorCategory: "organizational_profile_fit",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_gov_ownership",
          maximumPoints: 20,
          factorCategory: "capability_alignment",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_gov_availability",
          maximumPoints: 20,
          factorCategory: "publicly_evidenced_need",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_gov_scale",
          maximumPoints: 15,
          factorCategory: "operational_compatibility",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_gov_maturity",
          maximumPoints: 15,
          factorCategory: "capability_alignment",
          enabled: true,
        }),
        Object.freeze({
          ruleId: "rule_syn_fi_gov_fresh",
          maximumPoints: 10,
          factorCategory: "publicly_evidenced_need",
          enabled: true,
        }),
      ]),
    } satisfies MethodologyCapabilityRef),
  ]),
});

export type MethodologyManifest = typeof METHODOLOGY_MANIFEST;
