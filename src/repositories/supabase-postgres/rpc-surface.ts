import "server-only";

/**
 * Authenticated read RPC surface (institutionlens_api).
 * Maps typed gateway operations to SECURITY INVOKER Postgres functions.
 * Transport is `createAuthenticatedRpcGateway` (publishable key + user JWT only).
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

export const REMAINING_READ_RPC_FUNCTIONS = [
  "session_tenant_public_ref",
  "workspace_get",
  "provenance_get_by_domain_id",
  "capabilities_list",
  "assessments_list_portfolios",
  "assessments_get_portfolio_by_domain_id",
  "assessments_list_capabilities",
  "assessments_get_capability_by_domain_id",
  "assessments_get_ledger",
  "assessments_get_manifest",
  "assessments_get_opportunity_context",
  "portfolios_list",
  "portfolios_get_by_domain_id",
  "overlays_get_by_organization_domain_id",
  "overlays_list",
  "overlays_get_by_domain_id",
] as const;

export type RemainingReadRpcFunction = (typeof REMAINING_READ_RPC_FUNCTIONS)[number];

export const LIVE_READ_RPC_FUNCTIONS = [
  ...NARROW_READ_RPC_FUNCTIONS,
  ...REMAINING_READ_RPC_FUNCTIONS,
] as const;

export type LiveReadRpcFunction = (typeof LIVE_READ_RPC_FUNCTIONS)[number];

/** Gateway operations covered by applied + prepared read RPC migrations. */
export const LIVE_READ_GATEWAY_OPERATIONS = [
  ...NARROW_READ_GATEWAY_OPERATIONS,
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

export type LiveReadGatewayOperation = (typeof LIVE_READ_GATEWAY_OPERATIONS)[number];

export const GATEWAY_OPERATION_TO_RPC: Readonly<
  Record<LiveReadGatewayOperation, Exclude<LiveReadRpcFunction, "session_tenant_public_ref">>
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
  "workspace.get": "workspace_get",
  "provenance.getById": "provenance_get_by_domain_id",
  "capabilities.list": "capabilities_list",
  "assessments.getCapability": "assessments_get_capability_by_domain_id",
  "assessments.listCapabilities": "assessments_list_capabilities",
  "assessments.getPortfolio": "assessments_get_portfolio_by_domain_id",
  "assessments.listPortfolios": "assessments_list_portfolios",
  "assessments.getLedger": "assessments_get_ledger",
  "assessments.getManifest": "assessments_get_manifest",
  "assessments.getOpportunityContext": "assessments_get_opportunity_context",
  "portfolios.getById": "portfolios_get_by_domain_id",
  "portfolios.list": "portfolios_list",
  "overlays.getById": "overlays_get_by_domain_id",
  "overlays.getByOrganizationId": "overlays_get_by_organization_domain_id",
  "overlays.list": "overlays_list",
});

/** @deprecated Prefer LIVE_READ_GATEWAY_OPERATIONS — retained for Batch 4 contract names. */
export const DEFERRED_READ_GATEWAY_OPERATIONS = [] as const;

export function rpcQualifiedName(fn: LiveReadRpcFunction): string {
  return `${INSTITUTIONLENS_API_SCHEMA}.${fn}`;
}

export function isNarrowReadGatewayOperation(
  operation: string,
): operation is NarrowReadGatewayOperation {
  return (NARROW_READ_GATEWAY_OPERATIONS as readonly string[]).includes(operation);
}

export function isLiveReadGatewayOperation(
  operation: string,
): operation is LiveReadGatewayOperation {
  return (LIVE_READ_GATEWAY_OPERATIONS as readonly string[]).includes(operation);
}
