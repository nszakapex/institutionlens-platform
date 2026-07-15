import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { getDemoAuthorizationContext } from "@/authorization/demo-context";
import { buildBriefDocumentPageView } from "@/application/brief-service";
import { buildComparePageView } from "@/application/compare-service";
import { buildOrganizationDetailPageView } from "@/application/detail-service";
import { buildOverviewPageView } from "@/application/overview-service";
import { getTenantResearchReadModel } from "@/application/research-read-model";
import { briefPublicRefFor } from "@/domain/brief-public-ref";

const ROOT = process.cwd();
const RAW_ID_PATTERN =
  /tenant_[a-z0-9_]+|principal_[a-z0-9_]+|org_syn_[a-z0-9_]+|ev_syn_[a-z0-9_]+|prov_syn_[a-z0-9_]+|assess_[a-z0-9_]+|overlay_[a-z0-9_]+|ledger_[a-z0-9_]+|rule_syn_[a-z0-9_]+|cap_syn_[a-z0-9_]+|portfolio_syn_[a-z0-9_]+/;

function walk(directory: string, files: string[] = []): string[] {
  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

describe("production repository security boundary", () => {
  beforeAll(() => {
    process.env.IL_APP_MODE = "local-demo";
    process.env.IL_DEMO_TENANT_ID = "demo-tenant-local";
    process.env.IL_DEMO_PRINCIPAL_ID = "demo-principal-local";
  });

  it("does not import scoring generators or fixture loaders in production adapter modules", () => {
    for (const relative of [
      "src/repositories/supabase-postgres/gateway.ts",
      "src/repositories/supabase-postgres/adapter.ts",
      "src/repositories/supabase-postgres/rpc-surface.ts",
      "src/repositories/supabase-postgres/live-row-decoders.ts",
      "src/repositories/repository-config.ts",
      "src/repositories/repository-provider.ts",
    ]) {
      const content = readFileSync(path.join(ROOT, relative), "utf8");
      expect(content, relative).not.toMatch(/generateSyntheticAssessments/);
      expect(content, relative).not.toMatch(/loadFinancialInstitutionsStore/);
      expect(content, relative).not.toMatch(/@\/assessment\//);
      expect(content, relative).not.toMatch(/financial-institutions\/assessment/);
      expect(content, relative).not.toMatch(/let\s+(cached|cache)|globalThis|unstable_cache/);
    }
  });

  it("keeps repository and production configuration imports out of client modules", () => {
    const clientFiles = walk(path.join(ROOT, "src")).filter((file) =>
      /^['\"]use client['\"];/m.test(readFileSync(file, "utf8")),
    );
    expect(clientFiles.length).toBeGreaterThan(0);
    for (const file of clientFiles) {
      const content = readFileSync(file, "utf8");
      expect(content, path.relative(ROOT, file)).not.toMatch(/@\/repositories\//);
      expect(content, path.relative(ROOT, file)).not.toMatch(/IL_SUPABASE|SUPABASE_/);
      expect(content, path.relative(ROOT, file)).not.toMatch(
        /supabasePublishableKey|supabaseProjectRef|supabaseUrl/,
      );
    }
  });

  it("keeps raw IDs and configuration out of rendered view models", async () => {
    const context = getDemoAuthorizationContext();
    const research = await getTenantResearchReadModel(context);
    const first = research.organizations[0]!;
    const second = research.organizations[1]!;
    const outputs = [
      await buildOverviewPageView(context),
      await buildOrganizationDetailPageView(context, first.publicRef),
      await buildComparePageView(context, { org: [first.publicRef, second.publicRef] }),
      await buildBriefDocumentPageView(
        context,
        briefPublicRefFor(context.tenant.id, first.organizationId),
      ),
    ];

    for (const output of outputs) {
      const rendered = JSON.stringify(output);
      expect(rendered).not.toMatch(RAW_ID_PATTERN);
      expect(rendered).not.toMatch(
        /"(tenantId|principalId|organizationId|evidenceId|provenanceId)"/,
      );
      expect(rendered).not.toMatch(/\.supabase\.co|sb_publishable_/);
    }
  });
});
