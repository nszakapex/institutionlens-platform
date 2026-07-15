import type { Action } from "@/authorization/policy";
import { roleHasPermission } from "@/authorization/policy";
import type { Principal, Tenant } from "@/domain/schemas/tenant";
import { AuthorizationError } from "@/domain/errors";

export type AuthorizationContext = {
  tenant: Readonly<
    Omit<Tenant, "allowedVerticalIds"> & {
      allowedVerticalIds: readonly string[];
    }
  >;
  principal: Readonly<Principal>;
  permissions: readonly Action[];
  /**
   * Opaque tenant public ref (`tref_…`) for live RPC row binding.
   * Set only by server session binding — never from client input.
   * Required for production live-row decode; absent in synthetic demo.
   */
  tenantPublicRef?: string;
};

export function assertPermission(context: AuthorizationContext, action: Action): void {
  if (context.tenant.status !== "active") {
    throw new AuthorizationError("Tenant is not active.", "tenant_suspended");
  }
  if (context.principal.status !== "active") {
    throw new AuthorizationError("Principal is not active.", "principal_suspended");
  }
  if (context.principal.tenantId !== context.tenant.id) {
    throw new AuthorizationError("Principal does not belong to this tenant.", "tenant_mismatch");
  }
  if (!context.permissions.includes(action) || !roleHasPermission(context.principal.role, action)) {
    throw new AuthorizationError("Not authorized for this action.", `missing:${action}`);
  }
}

export function createAuthorizationContext(
  tenant: Tenant,
  principal: Principal,
  permissions: readonly Action[],
  options: Readonly<{ tenantPublicRef?: string }> = {},
): AuthorizationContext {
  if (principal.tenantId !== tenant.id) {
    throw new AuthorizationError("Principal does not belong to this tenant.", "tenant_mismatch");
  }
  return Object.freeze({
    tenant: Object.freeze({
      ...tenant,
      allowedVerticalIds: Object.freeze([...tenant.allowedVerticalIds]),
    }),
    principal: Object.freeze({ ...principal }),
    permissions: Object.freeze([...permissions]),
    ...(options.tenantPublicRef ? { tenantPublicRef: options.tenantPublicRef } : {}),
  });
}
