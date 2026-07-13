import "server-only";

import { getDemoPrincipal } from "@/lib/demo-tenant";
import { createAuthorizationContext, type AuthorizationContext } from "@/authorization/context";
import { permissionsForRole } from "@/authorization/policy";
import type { Principal, Tenant } from "@/domain/schemas/tenant";
import { PrincipalSchema, TenantSchema } from "@/domain/schemas/tenant";
import { DEMO_DOMAIN_PRINCIPAL_ID, DEMO_DOMAIN_TENANT_ID } from "@/domain/demo-constants";

export { DEMO_DOMAIN_PRINCIPAL_ID, DEMO_DOMAIN_TENANT_ID };

export const DEMO_TENANT: Tenant = TenantSchema.parse({
  id: DEMO_DOMAIN_TENANT_ID,
  displayName: "Local demo research workspace",
  status: "active",
  allowedVerticalIds: ["financial_institutions"],
  createdAt: "2026-01-15T12:00:00.000Z",
  dataClassification: "synthetic",
  demo: true,
});

export const DEMO_ANALYST: Principal = PrincipalSchema.parse({
  id: DEMO_DOMAIN_PRINCIPAL_ID,
  tenantId: DEMO_DOMAIN_TENANT_ID,
  displayName: "Demo analyst",
  role: "analyst",
  status: "active",
  demo: true,
});

/**
 * Builds a domain AuthorizationContext only after the Phase 1 demo principal gate succeeds.
 * Env tenant/principal strings are not copied into domain IDs and cannot be client-overridden.
 */
export function getDemoAuthorizationContext(): AuthorizationContext {
  getDemoPrincipal();
  const permissions = permissionsForRole("analyst").filter(
    (action) =>
      action === "organization:read" ||
      action === "evidence:read" ||
      action === "methodology:read" ||
      action === "assessment:read" ||
      action === "overlay:read" ||
      action === "brief:read",
  );
  return createAuthorizationContext(DEMO_TENANT, DEMO_ANALYST, permissions);
}
