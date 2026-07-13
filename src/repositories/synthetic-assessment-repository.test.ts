import { beforeEach, describe, expect, it } from "vitest";
import { createAuthorizationContext, type AuthorizationContext } from "@/authorization/context";
import { getDemoAuthorizationContext } from "@/authorization/demo-context";
import { permissionsForRole } from "@/authorization/policy";
import { NotFoundError } from "@/domain/errors";
import { PrincipalSchema, TenantSchema } from "@/domain/schemas/tenant";
import {
  SyntheticAssessmentRepository,
  __resetSyntheticAssessmentIndexForTests,
} from "@/repositories/synthetic-assessment-repository";

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

describe("SyntheticAssessmentRepository", () => {
  beforeEach(() => {
    setDemoEnv();
    __resetSyntheticAssessmentIndexForTests();
  });

  it("lists capability assessments for the demo tenant with stable bounds", async () => {
    const repository = new SyntheticAssessmentRepository();
    const context = getDemoAuthorizationContext();

    const page = await repository.listCapabilityAssessments(context, {
      page: 1,
      pageSize: 12,
    });

    expect(page.page).toBe(1);
    expect(page.pageSize).toBe(12);
    expect(page.items).toHaveLength(12);
    expect(page.total).toBe(120);
    expect(page.items.every((item) => item.tenantId === context.tenant.id)).toBe(true);

    const ids = page.items.map((item) => item.id);
    expect(ids).toEqual([...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
  });

  it("does not reveal cross-tenant assessments", async () => {
    const repository = new SyntheticAssessmentRepository();
    const demo = getDemoAuthorizationContext();
    const first = (await repository.listCapabilityAssessments(demo, { page: 1, pageSize: 1 }))
      .items[0];
    expect(first).toBeDefined();

    await expect(
      repository.getCapabilityAssessment(otherTenantContext(), first!.id),
    ).rejects.toThrow(NotFoundError);

    const otherList = await repository.listCapabilityAssessments(otherTenantContext(), {
      page: 1,
      pageSize: 12,
    });
    expect(otherList.total).toBe(0);
    expect(otherList.items).toHaveLength(0);
  });

  it("rejects page sizes above 50", async () => {
    const repository = new SyntheticAssessmentRepository();

    await expect(
      repository.listCapabilityAssessments(getDemoAuthorizationContext(), {
        pageSize: 51,
      } as never),
    ).rejects.toThrow();
  });

  it("returns portfolio assessments and opportunity context for the demo tenant", async () => {
    const repository = new SyntheticAssessmentRepository();
    const context = getDemoAuthorizationContext();

    const portfolios = await repository.listPortfolioAssessments(context, {
      page: 1,
      pageSize: 50,
    });
    expect(portfolios.total).toBe(24);
    expect(portfolios.items).toHaveLength(24);

    const first = portfolios.items[0]!;
    const opportunity = await repository.getOpportunityContext(
      context,
      first.organizationId,
      "cap_syn_fi_ops_analytics",
    );
    expect(opportunity.status).toBeTruthy();
    expect(opportunity.reasonCode).toMatch(/^[a-z][a-z0-9_]*$/);
  });
});
