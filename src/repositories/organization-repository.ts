import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import type { Organization } from "@/domain/schemas/organization";
import type { EvidenceRecord } from "@/domain/schemas/evidence";
import type { ProvenanceRecord } from "@/domain/schemas/provenance";
import type { Capability } from "@/domain/schemas/capability";
import type {
  CapabilityQueryInput,
  EvidenceQueryInput,
  OrganizationQueryInput,
} from "@/domain/schemas/query";
import type { OrganizationId, ProvenanceId } from "@/domain/ids";
import type { OrganizationPublicRef } from "@/domain/organization-public-ref";

export type PagedResult<T> = {
  items: readonly T[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * Tenant-safe organization repository.
 * Every operation requires AuthorizationContext — never a bare tenantId.
 */
export interface OrganizationRepository {
  getById(context: AuthorizationContext, organizationId: OrganizationId): Promise<Organization>;
  getByPublicRef(
    context: AuthorizationContext,
    organizationRef: OrganizationPublicRef,
  ): Promise<Organization>;
  list(
    context: AuthorizationContext,
    query: OrganizationQueryInput,
  ): Promise<PagedResult<Organization>>;
  count(context: AuthorizationContext, query: OrganizationQueryInput): Promise<number>;
  listEvidence(
    context: AuthorizationContext,
    organizationId: OrganizationId,
    query: EvidenceQueryInput,
  ): Promise<PagedResult<EvidenceRecord>>;
  getProvenance(
    context: AuthorizationContext,
    provenanceId: ProvenanceId,
  ): Promise<ProvenanceRecord>;
  listCapabilities(
    context: AuthorizationContext,
    query: CapabilityQueryInput,
  ): Promise<PagedResult<Capability>>;
}
