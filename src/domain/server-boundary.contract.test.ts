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
    const placeholders = [
      "src/app/(app)/organizations/page.tsx",
      "src/app/(app)/compare/page.tsx",
      "src/app/(app)/evidence/page.tsx",
      "src/app/(app)/briefs/page.tsx",
      "src/app/(app)/methodology/page.tsx",
      "src/app/(app)/settings/page.tsx",
    ];
    for (const relative of placeholders) {
      const content = readFileSync(path.join(ROOT, relative), "utf8");
      expect(content).toContain("PlaceholderPage");
      expect(content).not.toMatch(/buildSynthetic|loadFinancial|OrganizationRepository/);
    }
  });
});
