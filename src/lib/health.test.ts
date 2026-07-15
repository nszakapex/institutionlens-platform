import { describe, expect, it } from "vitest";
import { buildHealthPayload } from "@/lib/health";
import type { AuthPrincipal } from "@/lib/demo-tenant";

const demoPrincipal: AuthPrincipal = {
  principalId: "demo-principal-local",
  tenantId: "demo-tenant-local",
  roles: ["demo-viewer"],
  mode: "local-demo",
  productionReady: false,
  label: "Non-production synthetic demo principal",
};

describe("buildHealthPayload", () => {
  it("returns the approved minimal health body", () => {
    expect(buildHealthPayload(demoPrincipal)).toEqual({
      status: "ok",
      mode: "local-demo",
      synthetic: true,
      productionReady: false,
    });
  });

  it("never includes tenant ids, paths, versions, or timestamps", () => {
    const body = buildHealthPayload(demoPrincipal);
    const serialized = JSON.stringify(body);

    expect(serialized).not.toContain("demo-tenant");
    expect(serialized).not.toContain("demo-principal");
    expect(serialized).not.toContain("C:\\");
    expect(serialized).not.toContain("/Users/");
    expect(serialized).not.toContain("node_modules");
    expect(serialized).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(Object.keys(body).sort()).toEqual(["mode", "productionReady", "status", "synthetic"]);
  });

  it("cannot report productionReady true for a demo principal", () => {
    const body = buildHealthPayload(demoPrincipal);
    expect(body.productionReady).toBe(false);
  });

  it("reports live modes without claiming productionReady", () => {
    expect(buildHealthPayload({ mode: "staging", synthetic: false })).toEqual({
      status: "ok",
      mode: "staging",
      synthetic: false,
      productionReady: false,
    });
  });
});
