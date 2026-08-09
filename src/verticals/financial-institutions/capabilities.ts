import "server-only";

import type { Capability } from "@/domain/schemas/capability";
import { CapabilitySchema } from "@/domain/schemas/capability";
import { DEMO_DOMAIN_TENANT_ID } from "@/domain/demo-constants";
import { FINANCIAL_INSTITUTIONS_VERTICAL_ID } from "@/verticals/financial-institutions/schema";
import { DEFAULT_PUBLICATION_POLICY } from "@/domain/schemas/publication";

const CREATED = "2026-01-15T12:00:00.000Z";

/**
 * Fictional capability catalog for a specialized mortgage risk-analytics vendor
 * preparing institutional outreach. Not products, pricing, or proprietary methodology.
 */
const RAW: unknown[] = [
  {
    id: "cap_syn_fi_ops_analytics",
    name: "Prepayment and credit model fit",
    description:
      "Synthetic capability describing institutional fit for prepayment and credit risk modeling workflows used in mortgage and related portfolios.",
    category: "modeling",
  },
  {
    id: "cap_syn_fi_data_quality",
    name: "Loan and market data readiness",
    description:
      "Synthetic capability describing readiness of loan-level and market data foundations that support analytics licensing conversations.",
    category: "data",
  },
  {
    id: "cap_syn_fi_portfolio_reporting",
    name: "Valuation and risk reporting fit",
    description:
      "Synthetic capability describing alignment with portfolio valuation, risk measurement, and reporting workflows.",
    category: "reporting",
  },
  {
    id: "cap_syn_fi_scenario_planning",
    name: "Macro and stress scenario fit",
    description:
      "Synthetic capability describing interest in interest-rate, home-price, and unemployment scenario planning for mortgage risk work.",
    category: "planning",
  },
  {
    id: "cap_syn_fi_governance_review",
    name: "Model validation and governance fit",
    description:
      "Synthetic capability describing model validation, documentation, and governance review themes for regulated institutional buyers.",
    category: "governance",
  },
];

export const FINANCIAL_INSTITUTION_CAPABILITIES: readonly Capability[] = Object.freeze(
  RAW.map((item) => {
    const row = item as {
      id: string;
      name: string;
      description: string;
      category: string;
    };
    return CapabilitySchema.parse({
      id: row.id,
      tenantId: DEMO_DOMAIN_TENANT_ID,
      verticalId: FINANCIAL_INSTITUTIONS_VERTICAL_ID,
      name: row.name,
      description: row.description,
      category: row.category,
      status: "active",
      synthetic: true,
      dataClassification: "synthetic",
      evidenceRequirements: ["organization_profile", "operating_context"],
      publicationPolicy: DEFAULT_PUBLICATION_POLICY,
      createdAt: CREATED,
      domainSchemaVersion: "1.0.0",
    });
  }),
);
