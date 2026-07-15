/**
 * Validates Phase 5 read-model contracts: overview aggregates and explorer defaults.
 */
import { getDemoAuthorizationContext } from "@/authorization/demo-context";
import { buildOverviewPageView } from "@/application/overview-service";
import { buildExplorerPageView } from "@/application/explorer-service";

function setDemoEnv(): void {
  process.env.IL_APP_MODE = "local-demo";
  process.env.IL_DEMO_TENANT_ID = "demo-tenant-local";
  process.env.IL_DEMO_PRINCIPAL_ID = "demo-principal-local";
}

async function main() {
  setDemoEnv();
  const context = getDemoAuthorizationContext();
  const overview = await buildOverviewPageView(context);
  if (overview.state !== "ready") {
    throw new Error(`Overview not ready: ${overview.state}`);
  }
  const u = overview.universe;
  if (
    u.totalOrganizations !== 24 ||
    u.portfolioAssessed !== 16 ||
    u.portfolioInsufficientEvidence !== 8 ||
    u.capabilityAssessments !== 120 ||
    u.capabilityAssessed !== 77 ||
    u.capabilityInsufficientEvidence !== 43
  ) {
    throw new Error(`Unexpected universe partition: ${JSON.stringify(u)}`);
  }

  const explorer = await buildExplorerPageView(context, {});
  if (explorer.state !== "ready") {
    throw new Error(`Explorer not ready: ${explorer.state}`);
  }
  if (explorer.pageSize !== 12) {
    throw new Error(`Unexpected default page size: ${explorer.pageSize}`);
  }

  console.log("validate:read-models ok");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
