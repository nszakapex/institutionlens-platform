import type { AuthPrincipal } from "@/lib/demo-tenant";
import type { RepositoryConfig } from "@/repositories/repository-config";

export type HealthPayload = {
  status: "ok";
  mode: RepositoryConfig["mode"];
  synthetic: boolean;
  productionReady: boolean;
};

/**
 * Builds the approved health response.
 * Never includes tenant ids, env values, versions, paths, or timestamps.
 */
export function buildHealthPayload(
  principal: AuthPrincipal | Readonly<{ mode: RepositoryConfig["mode"]; synthetic: boolean }>,
): HealthPayload {
  if (principal.mode === "local-demo") {
    if ("productionReady" in principal && principal.productionReady !== false) {
      throw new Error("Health refused non-demo principal (fail closed).");
    }
    return {
      status: "ok",
      mode: "local-demo",
      synthetic: true,
      productionReady: false,
    };
  }

  return {
    status: "ok",
    mode: principal.mode,
    synthetic: "synthetic" in principal ? principal.synthetic : false,
    productionReady: false,
  };
}
