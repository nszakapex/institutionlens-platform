import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { RepositoryError, classifyRepositoryError } from "@/repositories/repository-errors";
import type {
  RepositoryOperation,
  RepositoryOperationMap,
  SupabasePostgresGateway,
  SupabasePostgresGatewayRequest,
} from "@/repositories/supabase-postgres/gateway";
import {
  GATEWAY_OPERATION_TO_RPC,
  isLiveReadGatewayOperation,
  type LiveReadGatewayOperation,
} from "@/repositories/supabase-postgres/rpc-surface";
import { TenantPublicRefSchema } from "@/repositories/supabase-postgres/live-row-decoders";

function requireTenantPublicRef(value: string | undefined): string {
  const parsed = TenantPublicRefSchema.safeParse(value);
  if (!parsed.success) throw new RepositoryError("MISCONFIGURED");
  return parsed.data;
}

function buildRpcArgs(
  operation: LiveReadGatewayOperation,
  tenantPublicRef: string,
  input: RepositoryOperationMap[LiveReadGatewayOperation]["input"],
): Record<string, unknown> {
  switch (operation) {
    case "workspace.get":
      return { p_tenant_public_ref: tenantPublicRef };
    case "organizations.getByPublicRef":
      return {
        p_tenant_public_ref: tenantPublicRef,
        p_public_ref: (input as { organizationRef: string }).organizationRef,
      };
    case "organizations.getById":
      return {
        p_tenant_public_ref: tenantPublicRef,
        p_domain_id: (input as { organizationId: string }).organizationId,
      };
    case "organizations.list":
    case "organizations.count":
    case "comparisons.list":
    case "briefSnapshots.list":
    case "capabilities.list":
    case "assessments.listCapabilities":
    case "assessments.listPortfolios":
    case "portfolios.list":
    case "overlays.list":
      return { p_tenant_public_ref: tenantPublicRef, p_query: input };
    case "evidence.listByOrganization": {
      const typed = input as {
        organizationId: string;
        query: Record<string, unknown>;
      };
      return {
        p_tenant_public_ref: tenantPublicRef,
        p_domain_id: typed.organizationId,
        p_query: typed.query,
      };
    }
    case "comparisons.getByPublicRef":
      return {
        p_tenant_public_ref: tenantPublicRef,
        p_public_ref: (input as { comparisonRef: string }).comparisonRef,
      };
    case "briefSnapshots.getByPublicRef":
      return {
        p_tenant_public_ref: tenantPublicRef,
        p_public_ref: (input as { briefSnapshotRef: string }).briefSnapshotRef,
      };
    case "provenance.getById":
      return {
        p_tenant_public_ref: tenantPublicRef,
        p_domain_id: (input as { provenanceId: string }).provenanceId,
      };
    case "assessments.getCapability":
    case "assessments.getPortfolio":
    case "assessments.getLedger":
    case "assessments.getManifest":
      return {
        p_tenant_public_ref: tenantPublicRef,
        p_domain_id: (input as { assessmentId: string }).assessmentId,
      };
    case "assessments.getOpportunityContext": {
      const typed = input as { organizationId: string; capabilityId: string };
      return {
        p_tenant_public_ref: tenantPublicRef,
        p_organization_domain_id: typed.organizationId,
        p_capability_domain_id: typed.capabilityId,
      };
    }
    case "portfolios.getById":
      return {
        p_tenant_public_ref: tenantPublicRef,
        p_domain_id: (input as { portfolioId: string }).portfolioId,
      };
    case "overlays.getById":
      return {
        p_tenant_public_ref: tenantPublicRef,
        p_domain_id: (input as { overlayId: string }).overlayId,
      };
    case "overlays.getByOrganizationId":
      return {
        p_tenant_public_ref: tenantPublicRef,
        p_domain_id: (input as { organizationId: string }).organizationId,
      };
    default: {
      const _exhaustive: never = operation;
      void _exhaustive;
      throw new RepositoryError("UNSUPPORTED_OPERATION");
    }
  }
}

/**
 * Authenticated PostgREST RPC transport for institutionlens_api.
 * Uses the caller JWT only — never a privileged client.
 */
export function createAuthenticatedRpcGateway(client: SupabaseClient): SupabasePostgresGateway {
  return {
    async execute<K extends RepositoryOperation>(
      request: SupabasePostgresGatewayRequest<K>,
    ): Promise<RepositoryOperationMap[K]["output"]> {
      if (request.signal.aborted) throw new RepositoryError("TIMEOUT");
      if (!isLiveReadGatewayOperation(request.operation)) {
        throw new RepositoryError("UNSUPPORTED_OPERATION");
      }
      const tenantPublicRef = requireTenantPublicRef(request.authorization.tenantPublicRef);
      const rpcName = GATEWAY_OPERATION_TO_RPC[request.operation];
      const args = buildRpcArgs(
        request.operation,
        tenantPublicRef,
        request.input as RepositoryOperationMap[LiveReadGatewayOperation]["input"],
      );

      try {
        const { data, error } = await client.schema("institutionlens_api").rpc(rpcName, args);
        if (request.signal.aborted) throw new RepositoryError("TIMEOUT");
        if (error) throw classifyRepositoryError(error);
        if (data === null || data === undefined) throw new RepositoryError("NOT_FOUND");
        return data as RepositoryOperationMap[K]["output"];
      } catch (error) {
        throw classifyRepositoryError(error);
      }
    },
  };
}
