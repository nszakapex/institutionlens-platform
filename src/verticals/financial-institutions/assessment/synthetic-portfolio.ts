import "server-only";

import { DEMO_DOMAIN_TENANT_ID } from "@/domain/demo-constants";
import { CapabilityPortfolioSchema, type CapabilityPortfolio } from "@/domain/portfolios/schemas";
import { DEFAULT_PUBLICATION_POLICY } from "@/domain/schemas/publication";
import {
  FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
  FINANCIAL_INSTITUTIONS_VERTICAL_ID,
} from "@/verticals/financial-institutions/schema";
import {
  CATALOG_VERSION,
  PORTFOLIO_VERSION,
} from "@/verticals/financial-institutions/assessment/methodology";

const CREATED = "2026-01-15T12:00:00.000Z";
const UPDATED = "2026-03-01T15:30:00.000Z";

/**
 * Active demo capability portfolio for the synthetic financial-institutions vertical.
 * Priorities are relative weights (ops highest); they need not sum to 100.
 */
export const SYNTHETIC_FI_PORTFOLIO: CapabilityPortfolio = CapabilityPortfolioSchema.parse({
  id: "portfolio_syn_fi_demo_research",
  tenantId: DEMO_DOMAIN_TENANT_ID,
  verticalId: FINANCIAL_INSTITUTIONS_VERTICAL_ID,
  adapterVersion: FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
  schemaVersion: "1.0.0",
  catalogVersion: CATALOG_VERSION,
  name: "Synthetic FI research portfolio",
  description:
    "Deterministic demo portfolio binding five synthetic capabilities for architecture validation.",
  status: "active",
  synthetic: true,
  createdAt: CREATED,
  updatedAt: UPDATED,
  capabilities: [
    {
      capabilityId: "cap_syn_fi_ops_analytics",
      status: "enabled",
      priority: 100,
      description: "Highest-priority operational analytics theme for the demo portfolio.",
      ruleSetId: "ruleset_syn_fi_ops_analytics",
      ruleSetVersion: PORTFOLIO_VERSION,
    },
    {
      capabilityId: "cap_syn_fi_data_quality",
      status: "enabled",
      priority: 80,
      description: "Data-quality modernization theme.",
      ruleSetId: "ruleset_syn_fi_data_quality",
      ruleSetVersion: PORTFOLIO_VERSION,
    },
    {
      capabilityId: "cap_syn_fi_portfolio_reporting",
      status: "enabled",
      priority: 60,
      description: "Portfolio reporting workflow theme.",
      ruleSetId: "ruleset_syn_fi_portfolio_reporting",
      ruleSetVersion: PORTFOLIO_VERSION,
    },
    {
      capabilityId: "cap_syn_fi_scenario_planning",
      status: "enabled",
      priority: 40,
      description: "Scenario-planning support theme.",
      ruleSetId: "ruleset_syn_fi_scenario_planning",
      ruleSetVersion: PORTFOLIO_VERSION,
    },
    {
      capabilityId: "cap_syn_fi_governance_review",
      status: "enabled",
      priority: 20,
      description: "Governance process review theme.",
      ruleSetId: "ruleset_syn_fi_governance_review",
      ruleSetVersion: PORTFOLIO_VERSION,
    },
  ],
  aggregationPolicy: {
    kind: "priority_weighted_average",
    minAssessedCapabilityRatio: "0.40",
    insufficientPortfolioRatio: "0.50",
    version: "1.0.0",
  },
  assessmentPolicy: {
    confidencePolicyVersion: "1.0.0",
    freshnessPolicyVersion: "1.0.0",
    completenessPolicyVersion: "1.0.0",
    version: "1.0.0",
  },
  publicationPolicy: DEFAULT_PUBLICATION_POLICY,
});
