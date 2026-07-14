import "server-only";

import type { RepositoryBundle } from "@/repositories/repository-contracts";
import {
  RepositoryConfigurationError,
  loadRepositoryConfig,
} from "@/repositories/repository-config";
import { createSyntheticRepositoryBundle } from "@/repositories/synthetic-repository-bundle";
import { createSupabasePostgresRepositoryBundle } from "@/repositories/supabase-postgres/adapter";
import type { SupabasePostgresGateway } from "@/repositories/supabase-postgres/gateway";

export type RepositoryProviderDependencies = Readonly<{
  gateway?: SupabasePostgresGateway;
  createSyntheticBundle?: () => RepositoryBundle;
}>;

/**
 * Creates request-scoped repository dependencies. The caller must never retain
 * this bundle across principals or requests.
 */
export function createRepositoryBundle(
  source: Record<string, string | undefined> = process.env,
  dependencies: RepositoryProviderDependencies = {},
): RepositoryBundle {
  const config = loadRepositoryConfig(source);
  if (config.mode === "local-demo") {
    return (dependencies.createSyntheticBundle ?? createSyntheticRepositoryBundle)();
  }

  if (!dependencies.gateway) {
    throw new RepositoryConfigurationError(["missing_production_configuration"]);
  }
  return createSupabasePostgresRepositoryBundle(config, dependencies.gateway);
}
