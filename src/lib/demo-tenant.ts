import "server-only";

import { EnvValidationError, assertNoPublicSecrets, loadServerEnv } from "@/lib/env";

/**
 * Authorization seam compatible with a future Supabase Auth + RLS model.
 * Phase 0–1 uses an explicit local-demo principal only.
 */
export type AuthPrincipal = {
  principalId: string;
  tenantId: string;
  roles: readonly ["demo-viewer"];
  mode: "local-demo";
  productionReady: false;
  label: "Non-production synthetic demo principal";
};

export class DemoTenantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DemoTenantError";
  }
}

/**
 * Resolves the server-only demo tenant context.
 * Fails closed when mode/context is missing or invalid.
 */
export function getDemoPrincipal(): AuthPrincipal {
  assertNoPublicSecrets();

  let env;
  try {
    env = loadServerEnv();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      throw new DemoTenantError(error.message);
    }
    throw error;
  }

  if (env.IL_APP_MODE !== "local-demo") {
    throw new DemoTenantError("Application mode is not local-demo. Refusing to continue.");
  }

  if (!env.IL_DEMO_TENANT_ID || !env.IL_DEMO_PRINCIPAL_ID) {
    throw new DemoTenantError("Demo tenant context missing. Fail closed.");
  }

  return {
    principalId: env.IL_DEMO_PRINCIPAL_ID,
    tenantId: env.IL_DEMO_TENANT_ID,
    roles: ["demo-viewer"],
    mode: "local-demo",
    productionReady: false,
    label: "Non-production synthetic demo principal",
  };
}

export function requireDemoTenantId(expectedTenantId: string): AuthPrincipal {
  const principal = getDemoPrincipal();
  if (principal.tenantId !== expectedTenantId) {
    throw new DemoTenantError("Tenant mismatch. Fail closed.");
  }
  return principal;
}
