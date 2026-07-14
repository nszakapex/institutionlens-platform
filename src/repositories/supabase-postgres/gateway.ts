import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import type { AssessmentManifest } from "@/domain/assessments/manifest";
import type { RuleLedgerEntry } from "@/domain/assessments/ledger";
import type {
  CapabilityAssessment,
  OpportunityContext,
  PortfolioAssessment,
} from "@/domain/assessments/results";
import type {
  AssessmentId,
  CapabilityId,
  OrganizationId,
  OverlayId,
  PortfolioId,
  ProvenanceId,
} from "@/domain/ids";
import type { OrganizationPublicRef } from "@/domain/organization-public-ref";
import type { OrganizationOverlay } from "@/domain/overlays/schemas";
import type { Capability } from "@/domain/schemas/capability";
import type { EvidenceRecord } from "@/domain/schemas/evidence";
import type { Organization } from "@/domain/schemas/organization";
import type { ProvenanceRecord } from "@/domain/schemas/provenance";
import type {
  AssessmentListQuery,
  CapabilityQuery,
  EvidenceQuery,
  OrganizationQuery,
  OverlayListQuery,
  PortfolioListQuery,
} from "@/domain/schemas/query";
import type { CapabilityPortfolio } from "@/domain/portfolios/schemas";
import type { PagedResult } from "@/repositories/organization-repository";
import type {
  BriefSnapshotListQuery,
  BriefSnapshotRecord,
  SavedComparisonListQuery,
  SavedComparisonRecord,
  WorkspaceContextRecord,
} from "@/repositories/repository-contracts";

export const REPOSITORY_SORT_ALLOWLISTS = Object.freeze({
  organizations: Object.freeze(["displayName", "updatedAt", "organizationType", "lifecycleStatus"]),
  evidence: Object.freeze(["id"]),
  provenance: Object.freeze(["id"]),
  capabilities: Object.freeze(["id"]),
  assessments: Object.freeze(["id"]),
  portfolios: Object.freeze(["id"]),
  overlays: Object.freeze(["id"]),
  comparisons: Object.freeze(["name", "updatedAt"]),
  briefSnapshots: Object.freeze(["createdAt", "updatedAt"]),
} as const);

export type RepositoryOperationMap = {
  "workspace.get": { input: Record<string, never>; output: WorkspaceContextRecord };
  "organizations.getById": { input: { organizationId: OrganizationId }; output: Organization };
  "organizations.getByPublicRef": {
    input: { organizationRef: OrganizationPublicRef };
    output: Organization;
  };
  "organizations.list": { input: OrganizationQuery; output: PagedResult<Organization> };
  "organizations.count": { input: OrganizationQuery; output: number };
  "evidence.listByOrganization": {
    input: { organizationId: OrganizationId; query: EvidenceQuery; sortField: "id" };
    output: PagedResult<EvidenceRecord>;
  };
  "provenance.getById": { input: { provenanceId: ProvenanceId }; output: ProvenanceRecord };
  "capabilities.list": {
    input: { query: CapabilityQuery; sortField: "id" };
    output: PagedResult<Capability>;
  };
  "assessments.getCapability": {
    input: { assessmentId: AssessmentId };
    output: CapabilityAssessment;
  };
  "assessments.listCapabilities": {
    input: { query: AssessmentListQuery; sortField: "id" };
    output: PagedResult<CapabilityAssessment>;
  };
  "assessments.getPortfolio": {
    input: { assessmentId: AssessmentId };
    output: PortfolioAssessment;
  };
  "assessments.listPortfolios": {
    input: { query: AssessmentListQuery; sortField: "id" };
    output: PagedResult<PortfolioAssessment>;
  };
  "assessments.getLedger": {
    input: { assessmentId: AssessmentId };
    output: readonly RuleLedgerEntry[];
  };
  "assessments.getManifest": {
    input: { assessmentId: AssessmentId };
    output: AssessmentManifest;
  };
  "assessments.getOpportunityContext": {
    input: { organizationId: OrganizationId; capabilityId: CapabilityId };
    output: OpportunityContext;
  };
  "portfolios.getById": { input: { portfolioId: PortfolioId }; output: CapabilityPortfolio };
  "portfolios.list": {
    input: { query: PortfolioListQuery; sortField: "id" };
    output: PagedResult<CapabilityPortfolio>;
  };
  "overlays.getById": { input: { overlayId: OverlayId }; output: OrganizationOverlay };
  "overlays.getByOrganizationId": {
    input: { organizationId: OrganizationId };
    output: OrganizationOverlay;
  };
  "overlays.list": {
    input: { query: OverlayListQuery; sortField: "id" };
    output: PagedResult<OrganizationOverlay>;
  };
  "comparisons.getByPublicRef": {
    input: { comparisonRef: SavedComparisonRecord["publicRef"] };
    output: SavedComparisonRecord;
  };
  "comparisons.list": {
    input: SavedComparisonListQuery;
    output: PagedResult<SavedComparisonRecord>;
  };
  "briefSnapshots.getByPublicRef": {
    input: { briefSnapshotRef: BriefSnapshotRecord["publicRef"] };
    output: BriefSnapshotRecord;
  };
  "briefSnapshots.list": {
    input: BriefSnapshotListQuery;
    output: PagedResult<BriefSnapshotRecord>;
  };
};

export type RepositoryOperation = keyof RepositoryOperationMap;

export type SupabasePostgresGatewayRequest<K extends RepositoryOperation> = Readonly<{
  operation: K;
  authorization: Readonly<{
    tenantId: string;
    principalId: string;
    permissions: readonly string[];
  }>;
  input: RepositoryOperationMap[K]["input"];
  signal: AbortSignal;
}>;

/**
 * Per-request, authenticated gateway. Batch 3 will bind the user session and
 * Batch 4 will implement the narrow RLS-backed RPCs. Privileged clients are
 * outside this user-request interface.
 */
export interface SupabasePostgresGateway {
  execute<K extends RepositoryOperation>(
    request: SupabasePostgresGatewayRequest<K>,
  ): Promise<RepositoryOperationMap[K]["output"]>;
}

export function gatewayAuthorization(context: AuthorizationContext) {
  return Object.freeze({
    tenantId: context.tenant.id,
    principalId: context.principal.id,
    permissions: Object.freeze([...context.permissions]),
  });
}
