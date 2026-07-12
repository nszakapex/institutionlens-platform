import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  normalizeSearchText,
  OrganizationQuerySchema,
} from "@/domain/schemas/query";

describe("OrganizationQuerySchema", () => {
  it("applies stable defaults", () => {
    const query = OrganizationQuerySchema.parse({});

    expect(query).toMatchObject({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      sortField: "displayName",
      sortDirection: "asc",
    });
  });

  it("accepts the maximum page size and rejects larger values", () => {
    expect(OrganizationQuerySchema.parse({ pageSize: MAX_PAGE_SIZE }).pageSize).toBe(MAX_PAGE_SIZE);
    expect(() => OrganizationQuerySchema.parse({ pageSize: MAX_PAGE_SIZE + 1 })).toThrow();
  });

  it("rejects unknown query keys and sort fields", () => {
    expect(() => OrganizationQuerySchema.parse({ unknown: true })).toThrow();
    expect(() => OrganizationQuerySchema.parse({ sortField: "tenantId" })).toThrow();
  });
});

describe("normalizeSearchText", () => {
  it("trims text, collapses internal whitespace, and preserves undefined", () => {
    expect(normalizeSearchText(undefined)).toBeUndefined();
    expect(normalizeSearchText("")).toBeUndefined();
    expect(normalizeSearchText("   \t  ")).toBeUndefined();
    expect(normalizeSearchText("  Northbridge   Example\nCredit Union  ")).toBe(
      "Northbridge Example Credit Union",
    );
  });
});
