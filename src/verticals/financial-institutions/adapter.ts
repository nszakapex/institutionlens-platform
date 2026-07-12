import "server-only";

import { z } from "zod";
import type { VerticalAdapter } from "@/verticals/contract";
import { ValidationError } from "@/domain/errors";
import { DEFAULT_PUBLICATION_POLICY } from "@/domain/schemas/publication";
import type { Organization } from "@/domain/schemas/organization";
import { FINANCIAL_INSTITUTION_CAPABILITIES } from "@/verticals/financial-institutions/capabilities";
import { buildSyntheticOrganizations } from "@/verticals/financial-institutions/synthetic-organizations";
import { buildSyntheticProvenanceAndEvidence } from "@/verticals/financial-institutions/synthetic-evidence";
import { FINANCIAL_INSTITUTIONS_VOCABULARY } from "@/verticals/financial-institutions/vocabulary";
import {
  DataAvailabilitySchema,
  FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
  FINANCIAL_INSTITUTIONS_FIXTURE_VERSION,
  FINANCIAL_INSTITUTIONS_VERTICAL_ID,
  FinancialInstitutionPayloadSchema,
  InstitutionKindSchema,
  OperatingRegionSchema,
  ScaleBandSchema,
  type FinancialInstitutionPayload,
} from "@/verticals/financial-institutions/schema";
import { FreshnessStatusSchema } from "@/domain/schemas/assessment";

const VerticalFilterSchema = z
  .object({
    institutionKind: InstitutionKindSchema.optional(),
    scaleBand: ScaleBandSchema.optional(),
    operatingRegion: OperatingRegionSchema.optional(),
    dataAvailability: DataAvailabilitySchema.optional(),
    freshnessCategory: FreshnessStatusSchema.optional(),
  })
  .strict();

function asPayload(organization: Organization): FinancialInstitutionPayload {
  return FinancialInstitutionPayloadSchema.parse(organization.verticalPayload);
}

export const financialInstitutionsAdapter: VerticalAdapter<FinancialInstitutionPayload> = {
  id: FINANCIAL_INSTITUTIONS_VERTICAL_ID,
  version: FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
  displayName: "Financial institutions (synthetic)",
  organizationNoun: "Financial institution",
  description:
    "Synthetic financial-institutions vertical for InstitutionLens architecture validation.",
  domainSchemaVersion: "1.0.0",
  organizationPayloadSchema: FinancialInstitutionPayloadSchema,
  supportedEvidenceTypes: [
    "organization_profile",
    "capability_signal",
    "public_change_signal",
    "data_availability",
    "operating_context",
  ],
  vocabulary: FINANCIAL_INSTITUTIONS_VOCABULARY,
  dataClassificationPolicy: "synthetic",
  publicationPolicy: DEFAULT_PUBLICATION_POLICY,
  verticalFilters: [
    {
      key: "institutionKind",
      description: "Synthetic bank or credit union",
      parse: (value) => InstitutionKindSchema.parse(value),
    },
    {
      key: "scaleBand",
      description: "Categorical balance-sheet scale band",
      parse: (value) => ScaleBandSchema.parse(value),
    },
    {
      key: "operatingRegion",
      description: "Fictional operating region code",
      parse: (value) => OperatingRegionSchema.parse(value),
    },
    {
      key: "dataAvailability",
      description: "Synthetic data-availability category",
      parse: (value) => DataAvailabilitySchema.parse(value),
    },
    {
      key: "freshnessCategory",
      description: "Evidence freshness category (applied at query layer when provided)",
      parse: (value) => FreshnessStatusSchema.parse(value),
    },
  ],
  loadSyntheticFixtures: () => {
    const organizations = buildSyntheticOrganizations().map((org) => {
      FinancialInstitutionPayloadSchema.parse(org.verticalPayload);
      return org;
    });
    const { evidence, provenance } = buildSyntheticProvenanceAndEvidence();
    return {
      fixtureVersion: FINANCIAL_INSTITUTIONS_FIXTURE_VERSION,
      organizations,
      evidence,
      provenance,
      capabilities: FINANCIAL_INSTITUTION_CAPABILITIES,
    };
  },
  validateVerticalFilters: (filters) => {
    if (!filters || Object.keys(filters).length === 0) return {};
    const parsed = VerticalFilterSchema.safeParse(filters);
    if (!parsed.success) {
      throw new ValidationError("Unsupported or invalid vertical filters.", parsed.error.message);
    }
    return parsed.data as Record<string, unknown>;
  },
  matchesVerticalFilters: (organization, filters) => {
    const payload = asPayload(organization);
    const kind = filters.institutionKind;
    if (typeof kind === "string" && payload.institutionKind !== kind) return false;
    const scale = filters.scaleBand;
    if (typeof scale === "string" && payload.balanceSheetScaleBand !== scale) return false;
    const region = filters.operatingRegion;
    if (typeof region === "string" && !payload.operatingRegions.includes(region as never)) {
      return false;
    }
    const availability = filters.dataAvailability;
    if (typeof availability === "string" && payload.regulatoryDataAvailability !== availability) {
      return false;
    }
    // freshnessCategory is applied by the repository against evidence, not payload.
    return true;
  },
};
