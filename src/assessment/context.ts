import type { OrganizationId } from "@/domain/ids";
import type { EvidenceRecord } from "@/domain/schemas/evidence";
import type { ObservationValue } from "@/domain/schemas/observation";
import type { ProvenanceRecord } from "@/domain/schemas/provenance";

export type FieldObservation = ObservationValue | null;

/**
 * Explicit lineage for an allowlisted scoring field.
 * Field predicates must cite these evidence IDs — never invent post-hoc support.
 */
export type FieldSourceRef = {
  evidenceIds: readonly string[];
};

export type EvaluationContext = {
  organizationId: OrganizationId;
  /** Tenant owning this evaluation — used for same-tenant provenance checks. */
  tenantId: string;
  assessedAt: string; // ISO UTC
  evidence: readonly EvidenceRecord[]; // already tenant-filtered, sorted by id
  provenanceById: ReadonlyMap<string, ProvenanceRecord>;
  /** Adapter-allowlisted fields only — engine never walks arbitrary paths */
  fields: Readonly<Record<string, FieldObservation>>;
  /**
   * Provenance-bearing field lineage. Every field used by a predicate must map to
   * evidence IDs that authorize that observation (or remain empty → cannot award).
   */
  fieldSources: Readonly<Record<string, FieldSourceRef>>;
  allowlistedFields: ReadonlySet<string>;
};
