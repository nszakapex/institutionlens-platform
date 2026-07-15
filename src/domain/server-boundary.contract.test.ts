import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

const FORBIDDEN_IMPORT_PATTERNS = [
  /@\/repositories\//,
  /@\/authorization\/(?!policy)/,
  /@\/application\//,
  /@\/verticals\/registry/,
  /@\/verticals\/financial-institutions\/(adapter|synthetic-|capabilities)/,
  /@\/lib\/demo-tenant/,
];

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

function isClientModule(content: string): boolean {
  return /^["']use client["'];/m.test(content);
}

describe("server-only domain boundary", () => {
  it("marks repository, auth context, registry, fixtures, and services as server-only", () => {
    const required = [
      "src/repositories/synthetic-organization-repository.ts",
      "src/repositories/synthetic-portfolio-repository.ts",
      "src/repositories/synthetic-overlay-repository.ts",
      "src/repositories/synthetic-assessment-repository.ts",
      "src/repositories/repository-config.ts",
      "src/repositories/repository-provider.ts",
      "src/repositories/repository-contracts.ts",
      "src/repositories/repository-errors.ts",
      "src/repositories/synthetic-repository-bundle.ts",
      "src/repositories/synthetic-saved-repositories.ts",
      "src/repositories/synthetic-workspace-repository.ts",
      "src/repositories/supabase-postgres/gateway.ts",
      "src/repositories/supabase-postgres/adapter.ts",
      "src/repositories/supabase-postgres/rpc-surface.ts",
      "src/repositories/supabase-postgres/live-row-decoders.ts",
      "src/authorization/demo-context.ts",
      "src/verticals/registry.ts",
      "src/verticals/financial-institutions/adapter.ts",
      "src/verticals/financial-institutions/synthetic-organizations.ts",
      "src/verticals/financial-institutions/synthetic-evidence.ts",
      "src/verticals/financial-institutions/capabilities.ts",
      "src/application/domain-foundation.ts",
      "src/application/organization-service.ts",
      "src/application/assessment-service.ts",
      "src/application/portfolio-service.ts",
      "src/application/research-read-model.ts",
      "src/application/overview-service.ts",
      "src/application/explorer-service.ts",
      "src/application/detail-service.ts",
      "src/application/evidence-catalog-service.ts",
      "src/application/methodology-service.ts",
      "src/application/compare-service.ts",
      "src/application/brief-service.ts",
      "src/domain/organization-public-ref.ts",
      "src/domain/brief-public-ref.ts",
      "src/lib/demo-tenant.ts",
    ];

    for (const relative of required) {
      const content = readFileSync(path.join(ROOT, relative), "utf8");
      expect(content, relative).toMatch(/import ["']server-only["']/);
    }
  });

  it("keeps client components free of server domain imports", () => {
    const clientFiles = walk(SRC).filter((file) => isClientModule(readFileSync(file, "utf8")));
    expect(clientFiles.length).toBeGreaterThan(0);

    const forbidden = [
      ...FORBIDDEN_IMPORT_PATTERNS,
      /@\/assessment\//,
      /@\/verticals\/financial-institutions\/assessment\/generate/,
    ];

    for (const file of clientFiles) {
      const content = readFileSync(file, "utf8");
      for (const pattern of forbidden) {
        expect(content, `${path.relative(ROOT, file)} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("does not expose repository or fixture data through API routes", () => {
    const health = readFileSync(path.join(ROOT, "src/app/api/health/route.ts"), "utf8");
    expect(health).not.toMatch(/OrganizationRepository|loadFinancialInstitutionsStore|fixtures/);
    expect(health).not.toMatch(/financial-institutions\/synthetic/);

    const apiFiles = walk(path.join(SRC, "app", "api"));
    expect(apiFiles).toHaveLength(1);
  });

  it("keeps placeholder routes free of direct fixture access", () => {
    const placeholders = ["src/app/(app)/settings/page.tsx"];
    for (const relative of placeholders) {
      const content = readFileSync(path.join(ROOT, relative), "utf8");
      expect(content).toContain("PlaceholderPage");
      expect(content).not.toMatch(/buildSynthetic|loadFinancial|OrganizationRepository/);
    }
  });

  it("keeps product routes on application services without fixture imports", () => {
    const productRoutes = [
      ["src/app/(app)/page.tsx", /buildOverviewPageView/],
      ["src/app/(app)/organizations/page.tsx", /buildExplorerPageView/],
      ["src/app/(app)/organizations/[organizationRef]/page.tsx", /buildOrganizationDetailPageView/],
      ["src/app/(app)/evidence/page.tsx", /buildEvidenceCatalogPageView/],
      ["src/app/(app)/methodology/page.tsx", /buildMethodologyPageView/],
      ["src/app/(app)/compare/page.tsx", /buildComparePageView/],
      ["src/app/(app)/briefs/page.tsx", /buildBriefDirectoryPageView/],
      ["src/app/(app)/briefs/[briefRef]/page.tsx", /buildBriefDocumentPageView/],
    ] as const;
    for (const [relative, servicePattern] of productRoutes) {
      const content = readFileSync(path.join(ROOT, relative), "utf8");
      expect(content).not.toMatch(
        /buildSynthetic|loadFinancial|OrganizationRepository|generateSynthetic/,
      );
      expect(content).toMatch(servicePattern);
    }
  });

  it("keeps ComparePage free of server-only query and public-ref imports", () => {
    const content = readFileSync(path.join(ROOT, "src/components/compare/ComparePage.tsx"), "utf8");
    expect(content).not.toMatch(/^["']use client["']/m);
    expect(content).not.toMatch(/from ["']@\/application\/compare-query["']/);
    expect(content).not.toMatch(/from ["']@\/domain\/organization-public-ref["']/);
    expect(content).toMatch(/removeHref/);
  });

  it("keeps CompareSelectionForm as a narrow client island without server imports", () => {
    const content = readFileSync(
      path.join(ROOT, "src/components/compare/CompareSelectionForm.tsx"),
      "utf8",
    );
    expect(content).toMatch(/^["']use client["']/m);
    expect(content).not.toMatch(/from ["']@\/application\//);
    expect(content).not.toMatch(/from ["']@\/authorization\//);
    expect(content).not.toMatch(/from ["']@\/domain\/organization-public-ref["']/);
    expect(content).not.toMatch(/from ["']@\/application\/compare-query["']/);
    expect(content).not.toMatch(/from ["']@\/application\/compare-service["']/);
    expect(content).toMatch(/from ["']@\/lib\/compare-url["']/);
  });

  it("builds inbound Compare hrefs through shared compareHrefFor on research surfaces", () => {
    for (const relative of [
      "src/application/overview-service.ts",
      "src/application/explorer-service.ts",
      "src/application/detail-service.ts",
    ]) {
      const content = readFileSync(path.join(ROOT, relative), "utf8");
      expect(content, relative).toMatch(/from ["']@\/application\/compare-query["']/);
      expect(content, relative).toMatch(/compareHrefFor\(\[org\.publicRef\]\)/);
    }
  });

  it("builds inbound Brief hrefs through shared inboundBriefActionFor on research surfaces", () => {
    for (const relative of [
      "src/application/overview-service.ts",
      "src/application/explorer-service.ts",
      "src/application/detail-service.ts",
      "src/application/compare-service.ts",
    ]) {
      const content = readFileSync(path.join(ROOT, relative), "utf8");
      expect(content, relative).toMatch(/from ["']@\/application\/inbound-brief-action["']/);
      expect(content, relative).toMatch(/inboundBriefActionFor\(/);
      expect(content, relative).not.toMatch(/briefPublicRefFor\(/);
      expect(content, relative).not.toMatch(/briefDocumentHref\(/);
    }
    const helper = readFileSync(path.join(ROOT, "src/application/inbound-brief-action.ts"), "utf8");
    expect(helper).toMatch(/import ["']server-only["']/);
    expect(helper).toMatch(/briefPublicRefFor\(/);
    expect(helper).toMatch(/briefDocumentHref\(/);
  });

  it("keeps research UI free of brief-public-ref and inbound-brief-action imports", () => {
    for (const relative of [
      "src/components/overview/PriorityShortlist.tsx",
      "src/components/explorer/ExplorerPage.tsx",
      "src/components/detail/OrganizationDetailPage.tsx",
      "src/components/compare/ComparePage.tsx",
    ]) {
      const content = readFileSync(path.join(ROOT, relative), "utf8");
      expect(content, relative).not.toMatch(/from ["']@\/domain\/brief-public-ref["']/);
      expect(content, relative).not.toMatch(/from ["']@\/application\/inbound-brief-action["']/);
      expect(content, relative).not.toMatch(/from ["']@\/application\/brief-query["']/);
      expect(content, relative).toMatch(/briefHref/);
    }
  });

  it("keeps BriefsWorkspacePage and BriefDocumentPage free of server-only query imports", () => {
    for (const relative of [
      "src/components/briefs/BriefsWorkspacePage.tsx",
      "src/components/briefs/BriefDocumentPage.tsx",
    ]) {
      const content = readFileSync(path.join(ROOT, relative), "utf8");
      expect(content, relative).not.toMatch(/^["']use client["']/m);
      expect(content, relative).not.toMatch(/from ["']@\/application\/brief-query["']/);
      expect(content, relative).not.toMatch(/from ["']@\/domain\/brief-public-ref["']/);
      expect(content, relative).not.toMatch(/from ["']@\/domain\/organization-public-ref["']/);
      expect(content, relative).not.toMatch(/from ["']@\/application\/brief-service["']/);
    }
  });

  it("keeps BriefSelectionForm as a narrow client island without server imports", () => {
    const content = readFileSync(
      path.join(ROOT, "src/components/briefs/BriefSelectionForm.tsx"),
      "utf8",
    );
    expect(content).toMatch(/^["']use client["']/m);
    expect(content).not.toMatch(/from ["']@\/application\//);
    expect(content).not.toMatch(/from ["']@\/authorization\//);
    expect(content).not.toMatch(/from ["']@\/domain\//);
    expect(content).not.toMatch(/from ["']@\/application\/brief-service["']/);
    expect(content).not.toMatch(/from ["']@\/domain\/brief-public-ref["']/);
  });
});
