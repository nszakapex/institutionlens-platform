import { describe, expect, it } from "vitest";
import {
  assertPermission,
  createAuthorizationContext,
  type AuthorizationContext,
} from "@/authorization/context";
import { permissionsForRole } from "@/authorization/policy";
import { AuthorizationError } from "@/domain/errors";
import {
  PrincipalSchema,
  TenantSchema,
  type Principal,
  type Tenant,
} from "@/domain/schemas/tenant";

const CREATED = "2026-01-15T12:00:00.000Z";

function tenant(overrides: Partial<Tenant> = {}): Tenant {
  return TenantSchema.parse({
    id: "tenant_demo_research",
    displayName: "Local demo research workspace",
    status: "active",
    allowedVerticalIds: ["financial_institutions"],
    createdAt: CREATED,
    dataClassification: "synthetic",
    demo: true,
    ...overrides,
  });
}

function principal(overrides: Partial<Principal> = {}): Principal {
  return PrincipalSchema.parse({
    id: "principal_demo_analyst",
    tenantId: "tenant_demo_research",
    displayName: "Demo analyst",
    role: "analyst",
    status: "active",
    demo: true,
    ...overrides,
  });
}

function context(
  overrides: {
    tenant?: Partial<Tenant>;
    principal?: Partial<Principal>;
    permissions?: AuthorizationContext["permissions"];
  } = {},
): AuthorizationContext {
  const parsedTenant = tenant(overrides.tenant);
  const parsedPrincipal = principal({
    tenantId: parsedTenant.id,
    ...overrides.principal,
  });
  return createAuthorizationContext(
    parsedTenant,
    parsedPrincipal,
    overrides.permissions ?? permissionsForRole(parsedPrincipal.role),
  );
}

describe("authorization context", () => {
  it("fails permission checks for a suspended tenant", () => {
    const suspended = context({ tenant: { status: "suspended" } });

    expect(() => assertPermission(suspended, "organization:read")).toThrow(AuthorizationError);
  });

  it("fails permission checks for a suspended principal", () => {
    const suspended = context({ principal: { status: "suspended" } });

    expect(() => assertPermission(suspended, "organization:read")).toThrow(AuthorizationError);
  });

  it("fails permission checks when the context omits the requested permission", () => {
    const readOnlyEvidence = context({ permissions: ["evidence:read"] });

    expect(() => assertPermission(readOnlyEvidence, "organization:read")).toThrow(
      AuthorizationError,
    );
  });

  it("fails permission checks when the role does not allow the requested action", () => {
    const analystWithInjectedPermission = context({ permissions: ["vertical:configure"] });

    expect(() => assertPermission(analystWithInjectedPermission, "vertical:configure")).toThrow(
      AuthorizationError,
    );
  });

  it("rejects createAuthorizationContext tenant mismatches", () => {
    expect(() =>
      createAuthorizationContext(
        tenant({ id: "tenant_demo_research" }),
        principal({ tenantId: "tenant_other_demo" }),
        ["organization:read"],
      ),
    ).toThrow(AuthorizationError);
  });

  it("freezes the context and nested permission arrays", () => {
    const active = context();

    expect(Object.isFrozen(active)).toBe(true);
    expect(Object.isFrozen(active.tenant)).toBe(true);
    expect(Object.isFrozen(active.tenant.allowedVerticalIds)).toBe(true);
    expect(Object.isFrozen(active.principal)).toBe(true);
    expect(Object.isFrozen(active.permissions)).toBe(true);
  });
});
