import "server-only";

import { createAuthorizationContextFromSession } from "@/authorization/session-context";
import { getDemoAuthorizationContext } from "@/authorization/demo-context";
import type { AuthorizationContext } from "@/authorization/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  RepositoryConfigurationError,
  loadRepositoryConfig,
  type ProductionRepositoryConfig,
  type RepositoryConfig,
} from "@/repositories/repository-config";
import { createRepositoryBundle } from "@/repositories/repository-provider";
import type { RepositoryBundle } from "@/repositories/repository-contracts";
import { createAuthenticatedRpcGateway } from "@/repositories/supabase-postgres/rpc-gateway";

export type RequestAccess = Readonly<{
  mode: RepositoryConfig["mode"];
  context: AuthorizationContext;
  repositories: RepositoryBundle;
  /** True when surfaces must treat data as synthetic demo. */
  synthetic: boolean;
}>;

/**
 * Resolves per-request authz + repositories.
 * local-demo → synthetic repos + demo principal (no Supabase session).
 * development|staging|production → cookie session + RPC gateway; fails closed on missing auth/config.
 * Never falls back from live to synthetic.
 */
export async function getRequestAccess(
  source: Record<string, string | undefined> = process.env,
): Promise<RequestAccess> {
  const config = loadRepositoryConfig(source);

  if (config.mode === "local-demo") {
    return Object.freeze({
      mode: "local-demo",
      context: getDemoAuthorizationContext(),
      repositories: createRepositoryBundle(source),
      synthetic: true,
    });
  }

  const production = config as ProductionRepositoryConfig;
  const client = await createSupabaseServerClient(production);
  const context = await createAuthorizationContextFromSession(client);
  const gateway = createAuthenticatedRpcGateway(client);
  const repositories = createRepositoryBundle(source, { gateway });

  if (repositories.adapter !== "supabase-postgres") {
    throw new RepositoryConfigurationError(["invalid_production_configuration"]);
  }

  return Object.freeze({
    mode: production.mode,
    context,
    repositories,
    synthetic: false,
  });
}
