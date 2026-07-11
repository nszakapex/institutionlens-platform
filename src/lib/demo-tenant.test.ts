import { describe, expect, it } from "vitest";
import { DemoTenantError, getDemoPrincipal, requireDemoTenantId } from "@/lib/demo-tenant";

describe("getDemoPrincipal", () => {
  it("returns a non-production demo principal", () => {
    process.env.IL_APP_MODE = "local-demo";
    process.env.IL_DEMO_TENANT_ID = "demo-tenant-local";
    process.env.IL_DEMO_PRINCIPAL_ID = "demo-principal-local";

    const principal = getDemoPrincipal();

    expect(principal.mode).toBe("local-demo");
    expect(principal.productionReady).toBe(false);
    expect(principal.tenantId).toBe("demo-tenant-local");
    expect(principal.label).toMatch(/Non-production/i);
  });

  it("fails closed when mode is invalid", () => {
    process.env.IL_APP_MODE = "staging";
    process.env.IL_DEMO_TENANT_ID = "demo-tenant-local";
    process.env.IL_DEMO_PRINCIPAL_ID = "demo-principal-local";

    expect(() => getDemoPrincipal()).toThrow(DemoTenantError);
  });

  it("fails closed on tenant mismatch", () => {
    process.env.IL_APP_MODE = "local-demo";
    process.env.IL_DEMO_TENANT_ID = "demo-tenant-local";
    process.env.IL_DEMO_PRINCIPAL_ID = "demo-principal-local";

    expect(() => requireDemoTenantId("other-tenant")).toThrow(DemoTenantError);
  });
});
