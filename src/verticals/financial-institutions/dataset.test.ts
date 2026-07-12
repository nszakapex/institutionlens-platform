import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { DEMO_DOMAIN_TENANT_ID } from "@/domain/demo-constants";
import { assertOrganizationFitUnassessed } from "@/domain/invariants";
import { loadFinancialInstitutionsStore } from "@/repositories/synthetic-organization-repository";
import {
  DATASET_DECLARATION,
  FINANCIAL_INSTITUTIONS_FIXTURE_VERSION,
} from "@/verticals/financial-institutions/schema";

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

function syntheticSourceText(): string {
  const files = [
    "src/verticals/financial-institutions/synthetic-organizations.ts",
    "src/verticals/financial-institutions/synthetic-evidence.ts",
    "src/verticals/financial-institutions/adapter.ts",
  ];
  return files.map((file) => readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");
}

describe("financial institutions synthetic dataset", () => {
  it("loads exactly 24 organizations with unique names and IDs", () => {
    const store = loadFinancialInstitutionsStore();
    const ids = new Set(store.organizations.map((org) => org.id));
    const names = new Set(store.organizations.map((org) => org.displayName));

    expect(store.organizations).toHaveLength(24);
    expect(ids.size).toBe(24);
    expect(names.size).toBe(24);
  });

  it("keeps every organization synthetic, tenant-scoped, and fit-unassessed", () => {
    const store = loadFinancialInstitutionsStore();

    for (const org of store.organizations) {
      expect(org.synthetic).toBe(true);
      expect(org.dataClassification).toBe("synthetic");
      expect(org.tenantId).toBe(DEMO_DOMAIN_TENANT_ID);
      expect(org.fit.status).toBe("unassessed");
      expect(() => assertOrganizationFitUnassessed(org.fit.status)).not.toThrow();
    }
  });

  it("exposes the declared fixture version and dataset declaration", () => {
    const store = loadFinancialInstitutionsStore();

    expect(store.fixtureVersion).toBe(FINANCIAL_INSTITUTIONS_FIXTURE_VERSION);
    expect(DATASET_DECLARATION).toMatch(/entirely synthetic/i);
    expect(DATASET_DECLARATION).toMatch(/InstitutionLens architecture/i);
    expect(
      store.organizations.every((org) =>
        JSON.stringify(org.verticalPayload).includes(DATASET_DECLARATION),
      ),
    ).toBe(true);
  });

  it("does not use Math.random in fixture construction", () => {
    expect(syntheticSourceText()).not.toMatch(/Math\.random\s*\(/);
  });

  it("is deterministic across module re-imports", async () => {
    vi.resetModules();
    const firstModule = await import("@/repositories/synthetic-organization-repository");
    const first = JSON.stringify(firstModule.loadFinancialInstitutionsStore());

    vi.resetModules();
    const secondModule = await import("@/repositories/synthetic-organization-repository");
    const second = JSON.stringify(secondModule.loadFinancialInstitutionsStore());

    expect(second).toBe(first);
  });

  it("contains no HTTP(S) references except .example labels", () => {
    const store = loadFinancialInstitutionsStore();
    const references = collectStrings(store).filter((value) => /^https?:\/\//i.test(value));

    expect(references.every((reference) => reference.endsWith(".example"))).toBe(true);
  });

  it("does not contain real-looking FDIC, NCUA, or LEI identifiers", () => {
    const store = loadFinancialInstitutionsStore();
    const strings = collectStrings(store);
    const regulatoryToken = /\b(?:FDIC|NCUA|LEI|CERT|RSSD|ABA)\b/i;
    const leiPattern = /\b[0-9A-Z]{18}[0-9]{2}\b/;

    expect(strings.filter((value) => regulatoryToken.test(value))).toEqual([]);
    expect(strings.filter((value) => leiPattern.test(value))).toEqual([]);
  });
});
