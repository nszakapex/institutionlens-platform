import type { z } from "zod";
import type { AdapterVersion, VerticalId } from "@/domain/ids";
import type { OrganizationQuery } from "@/domain/schemas/query";
import type { Organization } from "@/domain/schemas/organization";
import type { EvidenceRecord } from "@/domain/schemas/evidence";
import type { ProvenanceRecord } from "@/domain/schemas/provenance";
import type { Capability } from "@/domain/schemas/capability";
import type { PublicationPolicy } from "@/domain/schemas/publication";
import type { EvidenceType } from "@/domain/schemas/evidence";

export type VerticalFixtureBundle = {
  fixtureVersion: string;
  organizations: readonly Organization[];
  evidence: readonly EvidenceRecord[];
  provenance: readonly ProvenanceRecord[];
  capabilities: readonly Capability[];
};

export type VerticalFilterDefinition = {
  key: string;
  description: string;
  parse: (value: unknown) => unknown;
};

/**
 * Versioned vertical adapter contract.
 * Core domain never imports a concrete adapter module.
 */
export type VerticalAdapter<TPayload = unknown> = {
  id: VerticalId;
  version: AdapterVersion;
  displayName: string;
  organizationNoun: string;
  description: string;
  domainSchemaVersion: "1.0.0";
  organizationPayloadSchema: z.ZodType<TPayload>;
  supportedEvidenceTypes: readonly EvidenceType[];
  vocabulary: Readonly<Record<string, string>>;
  dataClassificationPolicy: "synthetic";
  publicationPolicy: PublicationPolicy;
  verticalFilters: readonly VerticalFilterDefinition[];
  loadSyntheticFixtures: () => VerticalFixtureBundle;
  validateVerticalFilters: (
    filters: Record<string, unknown> | undefined,
  ) => Record<string, unknown>;
  matchesVerticalFilters: (organization: Organization, filters: Record<string, unknown>) => boolean;
  toOrganizationSummaryExtras?: (organization: Organization) => Record<string, string>;
};

export function assertQueryVerticalFilters(
  adapter: VerticalAdapter,
  query: OrganizationQuery,
): Record<string, unknown> {
  return adapter.validateVerticalFilters(query.verticalFilters);
}
