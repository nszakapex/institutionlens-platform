import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAuthorizationContext, type AuthorizationContext } from "@/authorization/context";
import { isMembershipRole, mapMembershipRole } from "@/authorization/membership-role";
import { AuthorizationError } from "@/domain/errors";
import { PrincipalSchema, TenantSchema } from "@/domain/schemas/tenant";
import { RepositoryError } from "@/repositories/repository-errors";
import { TenantPublicRefSchema } from "@/repositories/supabase-postgres/live-row-decoders";

type WorkspaceRpcRow = {
  tenantPublicRef: string;
  tenantId: string;
  principalId: string;
  displayName: string;
  status: string;
  role: string;
  allowedVerticalIds?: string[] | null;
};

/**
 * Builds AuthorizationContext from the authenticated Supabase user session.
 * Tenant public ref comes only from session_tenant_public_ref() (membership/RLS).
 */
export async function createAuthorizationContextFromSession(
  client: SupabaseClient,
): Promise<AuthorizationContext> {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    throw new AuthorizationError("Authentication required.", "unauthenticated");
  }

  const { data: tenantRefRaw, error: tenantRefError } = await client
    .schema("institutionlens_api")
    .rpc("session_tenant_public_ref");
  if (tenantRefError) throw new RepositoryError("UNAVAILABLE");
  const tenantPublicRef = TenantPublicRefSchema.safeParse(tenantRefRaw);
  if (!tenantPublicRef.success) {
    throw new AuthorizationError("No active tenant membership.", "tenant_mismatch");
  }

  const { data, error } = await client.schema("institutionlens_api").rpc("workspace_get", {
    p_tenant_public_ref: tenantPublicRef.data,
  });
  if (error) throw new RepositoryError("UNAVAILABLE");
  if (!data || typeof data !== "object") throw new RepositoryError("NOT_FOUND");

  const workspace = data as WorkspaceRpcRow;
  if (!isMembershipRole(workspace.role)) {
    throw new AuthorizationError("Membership role is not recognized.", "invalid_role");
  }
  const mapped = mapMembershipRole(workspace.role);
  const boundRef = TenantPublicRefSchema.safeParse(workspace.tenantPublicRef);
  if (!boundRef.success || boundRef.data !== tenantPublicRef.data) {
    throw new RepositoryError("INVALID_RESPONSE");
  }

  const tenant = TenantSchema.parse({
    id: workspace.tenantId,
    displayName: workspace.displayName,
    status: workspace.status === "suspended" ? "suspended" : "active",
    allowedVerticalIds:
      Array.isArray(workspace.allowedVerticalIds) && workspace.allowedVerticalIds.length > 0
        ? workspace.allowedVerticalIds
        : ["financial_institutions"],
    createdAt: "1970-01-01T00:00:00.000Z",
    dataClassification: "internal",
    demo: false,
  });

  const principal = PrincipalSchema.parse({
    id: workspace.principalId,
    tenantId: tenant.id,
    displayName: workspace.displayName,
    role: mapped.principalRole,
    status: "active",
    demo: false,
  });

  return createAuthorizationContext(tenant, principal, mapped.permissions, {
    tenantPublicRef: tenantPublicRef.data,
  });
}
