import { describe, expect, it } from "vitest";
import { createAuthorizationContext } from "@/authorization/context";
import {
  DEMO_ANALYST,
  DEMO_TENANT,
  getDemoAuthorizationContext,
} from "@/authorization/demo-context";
import { getTenantResearchReadModel } from "@/application/research-read-model";
import { TenantSchema, PrincipalSchema } from "@/domain/schemas/tenant";

describe("research read model isolation", () => {
  it("scopes organizations to the authorized tenant", () => {
    const model = getTenantResearchReadModel(getDemoAuthorizationContext());
    expect(model.tenantId).toBe(DEMO_TENANT.id);
    expect(model.organizations).toHaveLength(24);
    expect(Object.isFrozen(model)).toBe(true);
    expect(Object.isFrozen(model.organizations)).toBe(true);
  });

  it("fails closed for a different tenant without data leakage", () => {
    const otherTenant = TenantSchema.parse({
      ...DEMO_TENANT,
      id: "tenant_other_research",
      displayName: "Other synthetic workspace",
    });
    const otherPrincipal = PrincipalSchema.parse({
      ...DEMO_ANALYST,
      id: "principal_other_analyst",
      tenantId: otherTenant.id,
    });
    const context = createAuthorizationContext(otherTenant, otherPrincipal, [
      "organization:read",
      "assessment:read",
    ]);
    const model = getTenantResearchReadModel(context);
    expect(model.tenantId).toBe(otherTenant.id);
    expect(model.organizations).toHaveLength(0);
  });

  it("does not reuse authorization across missing permissions", () => {
    const context = createAuthorizationContext(DEMO_TENANT, DEMO_ANALYST, ["organization:read"]);
    expect(() => getTenantResearchReadModel(context)).toThrow();
  });
});
