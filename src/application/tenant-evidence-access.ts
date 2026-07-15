import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import type { TenantResearchReadModel } from "@/application/research-read-model";
import type { ProvenanceId } from "@/domain/ids";
import type { EvidenceRecord } from "@/domain/schemas/evidence";
import type { ProvenanceRecord } from "@/domain/schemas/provenance";
import type { RepositoryBundle } from "@/repositories/repository-contracts";
import { RepositoryError } from "@/repositories/repository-errors";
import { loadFinancialInstitutionsStore } from "@/repositories/synthetic-organization-repository";

const EVIDENCE_PAGE_SIZE = 50 as const;

/**
 * Loads tenant-scoped evidence and provenance for catalog/compare surfaces.
 * Live mode paginates via repository gateway; synthetic/demo uses the fixture store.
 */
export async function loadTenantEvidenceCatalog(
  context: AuthorizationContext,
  model: TenantResearchReadModel,
  repositories?: RepositoryBundle,
): Promise<{
  evidence: readonly EvidenceRecord[];
  provenanceById: ReadonlyMap<string, ProvenanceRecord>;
}> {
  if (repositories?.adapter === "supabase-postgres") {
    const evidence: EvidenceRecord[] = [];
    for (const org of model.organizations) {
      let page = 1;
      for (;;) {
        const result = await repositories.organizations.listEvidence(context, org.organizationId, {
          page,
          pageSize: EVIDENCE_PAGE_SIZE,
        });
        evidence.push(...result.items);
        if (page * result.pageSize >= result.total || result.items.length === 0) break;
        page += 1;
      }
    }
    const provenanceIds = new Set(
      evidence.map((item) => item.provenanceId).filter((id): id is ProvenanceId => id !== null),
    );
    const provenanceById = new Map<string, ProvenanceRecord>();
    for (const provenanceId of provenanceIds) {
      try {
        provenanceById.set(
          provenanceId,
          await repositories.organizations.getProvenance(context, provenanceId),
        );
      } catch (error) {
        if (error instanceof RepositoryError && error.code === "NOT_FOUND") continue;
        throw error;
      }
    }
    return { evidence: Object.freeze(evidence), provenanceById };
  }

  const store = loadFinancialInstitutionsStore();
  return {
    evidence: store.evidence.filter((item) => item.tenantId === context.tenant.id),
    provenanceById: new Map(
      store.provenance
        .filter((item) => item.tenantId === context.tenant.id)
        .map((item) => [item.id, item] as const),
    ),
  };
}

/**
 * Evidence + provenance for a single organization (detail / brief documents).
 */
export async function loadOrganizationEvidenceCatalog(
  context: AuthorizationContext,
  organizationId: string,
  repositories?: RepositoryBundle,
): Promise<{
  evidence: readonly EvidenceRecord[];
  provenanceById: ReadonlyMap<string, ProvenanceRecord>;
}> {
  if (repositories?.adapter === "supabase-postgres") {
    const evidence: EvidenceRecord[] = [];
    let page = 1;
    for (;;) {
      const result = await repositories.organizations.listEvidence(context, organizationId, {
        page,
        pageSize: EVIDENCE_PAGE_SIZE,
      });
      evidence.push(...result.items);
      if (page * result.pageSize >= result.total || result.items.length === 0) break;
      page += 1;
    }
    const provenanceIds = new Set(
      evidence.map((item) => item.provenanceId).filter((id): id is ProvenanceId => id !== null),
    );
    const provenanceById = new Map<string, ProvenanceRecord>();
    for (const provenanceId of provenanceIds) {
      try {
        provenanceById.set(
          provenanceId,
          await repositories.organizations.getProvenance(context, provenanceId),
        );
      } catch (error) {
        if (error instanceof RepositoryError && error.code === "NOT_FOUND") continue;
        throw error;
      }
    }
    return { evidence: Object.freeze(evidence), provenanceById };
  }

  const store = loadFinancialInstitutionsStore();
  const evidence = store.evidence.filter(
    (item) => item.tenantId === context.tenant.id && item.organizationId === organizationId,
  );
  const provenanceIds = new Set(
    evidence.map((item) => item.provenanceId).filter((id): id is string => id !== null),
  );
  return {
    evidence,
    provenanceById: new Map(
      store.provenance
        .filter((item) => item.tenantId === context.tenant.id && provenanceIds.has(item.id))
        .map((item) => [item.id, item] as const),
    ),
  };
}
