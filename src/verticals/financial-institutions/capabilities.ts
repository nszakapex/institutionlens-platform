import "server-only";

import type { Capability } from "@/domain/schemas/capability";
import { CapabilitySchema } from "@/domain/schemas/capability";
import { DEMO_DOMAIN_TENANT_ID } from "@/domain/demo-constants";
import { FINANCIAL_INSTITUTIONS_VERTICAL_ID } from "@/verticals/financial-institutions/schema";
import { DEFAULT_PUBLICATION_POLICY } from "@/domain/schemas/publication";

const CREATED = "2026-01-15T12:00:00.000Z";

/**
 * Fictional capability catalog — not products, pricing, or proprietary methodology.
 */
const RAW: unknown[] = [
  {
    id: "cap_syn_fi_ops_analytics",
    name: "Operational analytics support",
    description:
      "Synthetic capability describing interest in operational analytics workflows for demo institutions.",
    category: "operations",
  },
  {
    id: "cap_syn_fi_data_quality",
    name: "Data-quality modernization",
    description:
      "Synthetic capability describing data-quality modernization themes for interface validation.",
    category: "data",
  },
  {
    id: "cap_syn_fi_portfolio_reporting",
    name: "Portfolio reporting workflow",
    description:
      "Synthetic capability describing portfolio reporting workflow needs without real portfolio data.",
    category: "reporting",
  },
  {
    id: "cap_syn_fi_scenario_planning",
    name: "Scenario-planning support",
    description:
      "Synthetic capability describing scenario-planning support as a fictional alignment theme.",
    category: "planning",
  },
  {
    id: "cap_syn_fi_governance_review",
    name: "Governance process review",
    description:
      "Synthetic capability describing governance process review themes for demo evidence linkage.",
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
