import { beforeEach, describe, expect, it } from "vitest";
import { createAuthorizationContext, type AuthorizationContext } from "@/authorization/context";
import { getDemoAuthorizationContext } from "@/authorization/demo-context";
import { permissionsForRole } from "@/authorization/policy";
import { NotFoundError, ValidationError } from "@/domain/errors";
import { PrincipalSchema, TenantSchema } from "@/domain/schemas/tenant";
import {
  loadFinancialInstitutionsStore,
  SyntheticOrganizationRepository,
} from "@/repositories/synthetic-organization-repository";

function setDemoEnv(): void {
  process.env.IL_APP_MODE = "local-demo";
  process.env.IL_DEMO_TENANT_ID = "demo-tenant-local";
  process.env.IL_DEMO_PRINCIPAL_ID = "demo-principal-local";
}

function otherTenantContext(): AuthorizationContext {
  const tenant = TenantSchema.parse({
    id: "tenant_other_demo",
    displayName: "Other demo workspace",
    status: "active",
    allowedVerticalIds: ["financial_institutions"],
    createdAt: "2026-01-15T12:00:00.000Z",
    dataClassification: "synthetic",
    demo: true,
  });
  const principal = PrincipalSchema.parse({
    id: "principal_other_demo",
    tenantId: tenant.id,
    displayName: "Other demo analyst",
    role: "analyst",
    status: "active",
    demo: true,
  });
  return createAuthorizationContext(tenant, principal, permissionsForRole("analyst"));
}

describe("SyntheticOrganizationRepository", () => {
  beforeEach(() => {
    setDemoEnv();
  });

  it("reads organizations for the same tenant", async () => {
    const store = loadFinancialInstitutionsStore();
    const repository = new SyntheticOrganizationRepository(store);
    const context = getDemoAuthorizationContext();
    const first = store.organizations[0];
    expect(first).toBeDefined();

    const result = await repository.getById(context, first!.id);

    expect(result.id).toBe(first!.id);
    expect(result.tenantId).toBe(context.tenant.id);
  });

  it("does not reveal cross-tenant organizations", async () => {
    const store = loadFinancialInstitutionsStore();
    const repository = new SyntheticOrganizationRepository(store);
    const first = store.organizations[0];
    expect(first).toBeDefined();

    await expect(repository.getById(otherTenantContext(), first!.id)).rejects.toThrow(
      NotFoundError,
    );
  });

  it("defaults list page size to 12", async () => {
    const repository = new SyntheticOrganizationRepository();
    const result = await repository.list(getDemoAuthorizationContext(), {});

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(12);
    expect(result.items).toHaveLength(12);
    expect(result.total).toBe(24);
  });

  it("rejects page sizes above 50", async () => {
    const repository = new SyntheticOrganizationRepository();

    await expect(
      repository.list(getDemoAuthorizationContext(), { pageSize: 51 } as never),
    ).rejects.toThrow();
  });

  it("rejects unknown sort fields through the query schema", async () => {
    const repository = new SyntheticOrganizationRepository();

    await expect(
      repository.list(getDemoAuthorizationContext(), { sortField: "unknown" } as never),
    ).rejects.toThrow();
  });

  it("rejects unsupported vertical filter keys", async () => {
    const repository = new SyntheticOrganizationRepository();

    await expect(
      repository.list(getDemoAuthorizationContext(), {
        verticalId: "financial_institutions",
        verticalFilters: { unsupportedFilter: "value" },
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("normalizes and bounds text search", async () => {
    const repository = new SyntheticOrganizationRepository();
    const context = getDemoAuthorizationContext();

    const result = await repository.list(context, { text: "  northbridge   example  " });
    await expect(repository.list(context, { text: "x".repeat(81) } as never)).rejects.toThrow();

    expect(result.total).toBe(1);
    expect(result.items[0]?.displayName).toBe("Northbridge Example Credit Union");
  });

  it("returns frozen result arrays and frozen organization objects", async () => {
    const repository = new SyntheticOrganizationRepository();
    const page = await repository.list(getDemoAuthorizationContext(), {});

    expect(Object.isFrozen(page.items)).toBe(true);
    expect(Object.isFrozen(page.items[0])).toBe(true);
    expect(Object.isFrozen(page.items[0]?.tags)).toBe(true);
    expect(Object.isFrozen(page.items[0]?.verticalPayload)).toBe(true);
  });

  it("counts organizations within the requesting tenant only", async () => {
    const repository = new SyntheticOrganizationRepository();

    await expect(repository.count(getDemoAuthorizationContext(), {})).resolves.toBe(24);
    await expect(repository.count(otherTenantContext(), {})).resolves.toBe(0);
  });
});
