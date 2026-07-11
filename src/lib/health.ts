import type { AuthPrincipal } from "@/lib/demo-tenant";

export type HealthPayload = {
  status: "ok";
  mode: "local-demo";
  synthetic: true;
  productionReady: false;
};

/**
 * Builds the approved health response.
 * Always `productionReady: false` while demo authentication is active.
 * Never includes tenant ids, env values, versions, paths, or timestamps.
 */
export function buildHealthPayload(principal: AuthPrincipal): HealthPayload {
  if (principal.mode !== "local-demo" || principal.productionReady !== false) {
    throw new Error("Health refused non-demo principal (fail closed).");
  }

  return {
    status: "ok",
    mode: "local-demo",
    synthetic: true,
    productionReady: false,
  };
}
