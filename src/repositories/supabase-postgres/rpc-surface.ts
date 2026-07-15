import "server-only";

/**
 * Narrow authenticated read RPC surface (institutionlens_api).
 * Maps typed gateway operations to SECURITY INVOKER Postgres functions.
 * Does not implement transport; Batch 3 binds the session before these can run live.
 */

export const INSTITUTIONLENS_API_SCHEMA = "institutionlens_api" as const;

export const NARROW_READ_RPC_FUNCTIONS = [
  "organizations_get_by_public_ref",
  "organizations_get_by_domain_id",
  "organizations_list",
  "organizations_count",
  "evidence_list_by_organization_domain_id",
  "comparisons_get_by_public_ref",
  "comparisons_list",
  "brief_snapshots_get_by_public_ref",
  "brief_snapshots_list",
] as const;

export type NarrowReadRpcFunction = (typeof NARROW_READ_RPC_FUNCTIONS)[number];

/** Gateway operations covered by this Batch 4 RPC slice. */
export const NARROW_READ_GATEWAY_OPERATIONS = [
  "organizations.getById",
  "organizations.getByPublicRef",
  "organizations.list",
  "organizations.count",
  "evidence.listByOrganization",
  "comparisons.getByPublicRef",
  "comparisons.list",
  "briefSnapshots.getByPublicRef",
  "briefSnapshots.list",
] as const;

export type NarrowReadGatewayOperation = (typeof NARROW_READ_GATEWAY_OPERATIONS)[number];

export const GATEWAY_OPERATION_TO_RPC: Readonly<
  Record<NarrowReadGatewayOperation, NarrowReadRpcFunction>
> = Object.freeze({
  "organizations.getById": "organizations_get_by_domain_id",
  "organizations.getByPublicRef": "organizations_get_by_public_ref",
  "organizations.list": "organizations_list",
  "organizations.count": "organizations_count",
  "evidence.listByOrganization": "evidence_list_by_organization_domain_id",
  "comparisons.getByPublicRef": "comparisons_get_by_public_ref",
  "comparisons.list": "comparisons_list",
  "briefSnapshots.getByPublicRef": "brief_snapshots_get_by_public_ref",
  "briefSnapshots.list": "brief_snapshots_list",
});

export function rpcQualifiedName(fn: NarrowReadRpcFunction): string {
  return `${INSTITUTIONLENS_API_SCHEMA}.${fn}`;
}

export function isNarrowReadGatewayOperation(
  operation: string,
): operation is NarrowReadGatewayOperation {
  return (NARROW_READ_GATEWAY_OPERATIONS as readonly string[]).includes(operation);
}

/** Gateway operations intentionally deferred — must fail closed in production adapters. */
export const DEFERRED_READ_GATEWAY_OPERATIONS = [
  "workspace.get",
  "provenance.getById",
  "capabilities.list",
  "assessments.getCapability",
  "assessments.listCapabilities",
  "assessments.getPortfolio",
  "assessments.listPortfolios",
  "assessments.getLedger",
  "assessments.getManifest",
  "assessments.getOpportunityContext",
  "portfolios.getById",
  "portfolios.list",
  "overlays.getById",
  "overlays.getByOrganizationId",
  "overlays.list",
] as const;
