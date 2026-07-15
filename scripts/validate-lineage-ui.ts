import { getDemoAuthorizationContext } from "@/authorization/demo-context";
import { buildOrganizationDetailPageView } from "@/application/detail-service";
import { getTenantResearchReadModel } from "@/application/research-read-model";

function setDemoEnv(): void {
  process.env.IL_APP_MODE = "local-demo";
  process.env.IL_DEMO_TENANT_ID = "demo-tenant-local";
  process.env.IL_DEMO_PRINCIPAL_ID = "demo-principal-local";
}

async function main(): Promise<void> {
  setDemoEnv();
  const context = getDemoAuthorizationContext();
  const model = await getTenantResearchReadModel(context);
  let awardedRows = 0;

  for (const organization of model.organizations) {
    const detail = await buildOrganizationDetailPageView(context, organization.publicRef);
    if (detail.state !== "ok") {
      throw new Error("Every synthetic organization must build a detail lineage view.");
    }
    const serialized = JSON.stringify(detail);
    if (
      /\b(?:org|ev|prov|assess|overlay|tenant|principal|ledger|rule|ruleset|cap)_[a-z0-9_]+\b/i.test(
        serialized,
      )
    ) {
      throw new Error("Detail view models must not serialize raw internal identifiers.");
    }
    if (/synthetic:\/\//i.test(serialized)) {
      throw new Error("Detail view models must not serialize raw synthetic source references.");
    }
    for (const capability of detail.capabilities) {
      for (const row of capability.ledgerRows) {
        if (row.outcomeLabel !== "Awarded") continue;
        awardedRows += 1;
        if (row.pointsAwarded <= 0 || row.lineage.length === 0) {
          throw new Error(
            "Every awarded UI rule row requires positive points and safe evidence lineage.",
          );
        }
      }
    }
  }

  if (awardedRows !== 233) {
    throw new Error(`Expected 233 awarded UI ledger rows; received ${awardedRows}.`);
  }

  console.log(
    `Lineage UI validated: ${model.organizations.length} organizations, ${awardedRows} awarded rows, no raw IDs.`,
  );
}

void main();
