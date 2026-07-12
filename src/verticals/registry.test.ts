import { describe, expect, it } from "vitest";
import { UnsupportedAdapterVersionError, UnsupportedVerticalError } from "@/domain/errors";
import {
  getActiveAdapterVersion,
  listRegisteredAdapters,
  resolveAdapter,
} from "@/verticals/registry";

describe("vertical registry", () => {
  it("resolves the registered financial institutions adapter by exact version", () => {
    const adapter = resolveAdapter("financial_institutions", "1.0.0");

    expect(adapter.id).toBe("financial_institutions");
    expect(adapter.version).toBe("1.0.0");
    expect(adapter.displayName).toContain("Financial institutions");
  });

  it("rejects unknown vertical IDs", () => {
    expect(() => resolveAdapter("healthcare_systems", "1.0.0")).toThrow(UnsupportedVerticalError);
  });

  it("rejects unknown versions without falling back to the active version", () => {
    expect(getActiveAdapterVersion("financial_institutions")).toBe("1.0.0");
    expect(() => resolveAdapter("financial_institutions", "9.9.9")).toThrow(
      UnsupportedAdapterVersionError,
    );
  });

  it("lists registered adapters as immutable public metadata", () => {
    const adapters = listRegisteredAdapters();

    expect(adapters).toEqual([
      {
        id: "financial_institutions",
        version: "1.0.0",
        displayName: "Financial institutions (synthetic)",
      },
    ]);
    expect(Object.isFrozen(adapters[0])).toBe(true);
    expect(adapters[0]).not.toHaveProperty("loadSyntheticFixtures");
  });
});
