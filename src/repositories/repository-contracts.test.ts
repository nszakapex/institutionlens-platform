import { beforeEach, describe, expect, it } from "vitest";
import { createAuthorizationContext } from "@/authorization/context";
import { getDemoAuthorizationContext } from "@/authorization/demo-context";
import { NotFoundError } from "@/domain/errors";
import { organizationPublicRefFor } from "@/domain/organization-public-ref";
import { PrincipalSchema, TenantSchema } from "@/domain/schemas/tenant";
import {
  BriefSnapshotListQuerySchema,
  SavedComparisonListQuerySchema,
} from "@/repositories/repository-contracts";
import { createSyntheticRepositoryBundle } from "@/repositories/synthetic-repository-bundle";

function setDemoEnv(): void {
  process.env.IL_APP_MODE = "local-demo";
  process.env.IL_DEMO_TENANT_ID = "demo-tenant-local";
  process.env.IL_DEMO_PRINCIPAL_ID = "demo-principal-local";
}

describe("repository contracts", () => {
  beforeEach(setDemoEnv);

  it("keeps synthetic adapters behind the complete shared bundle", async () => {
    const bundle = createSyntheticRepositoryBundle();
    const context = getDemoAuthorizationContext();
    const workspace = await bundle.workspace.getCurrent(context);
    const organizations = await bundle.organizations.list(context, { page: 1, pageSize: 1 });
    const organization = organizations.items[0]!;
    const resolved = await bundle.organizations.getByPublicRef(
      context,
      organizationPublicRefFor(organization.id),
    );
    const evidence = await bundle.organizations.listEvidence(context, organization.id, {
      page: 1,
      pageSize: 1,
    });
    const assessments = await bundle.assessments.listPortfolioAssessments(context, {
      organizationId: organization.id,
      page: 1,
      pageSize: 1,
    });

    expect(bundle.adapter).toBe("synthetic");
    expect(workspace.tenantId).toBe(context.tenant.id);
    expect(resolved.id).toBe(organization.id);
    expect(evidence.items.every((item) => item.tenantId === context.tenant.id)).toBe(true);
    expect(assessments.items).toHaveLength(1);
    expect((await bundle.comparisons.list(context, {})).total).toBe(0);
    expect((await bundle.briefSnapshots.list(context, {})).total).toBe(0);
    expect(bundle.documents).toBeDefined();
    expect((await bundle.documents.list(context, { pageSize: 1 })).total).toBeGreaterThanOrEqual(1);
  });

  it("resolves opaque organization references only inside the active tenant", async () => {
    const bundle = createSyntheticRepositoryBundle();
    const context = getDemoAuthorizationContext();
    const organization = (await bundle.organizations.list(context, { pageSize: 1 })).items[0]!;
    const tenant = TenantSchema.parse({
      ...context.tenant,
      id: "tenant_other_demo",
      displayName: "Other tenant",
    });
    const principal = PrincipalSchema.parse({
      ...context.principal,
      id: "principal_other_demo",
      tenantId: tenant.id,
    });
    const otherContext = createAuthorizationContext(tenant, principal, context.permissions);

    await expect(
      bundle.organizations.getByPublicRef(otherContext, organizationPublicRefFor(organization.id)),
    ).rejects.toThrow(NotFoundError);
  });

  it("bounds pagination and exposes only explicit sort allowlists", () => {
    expect(() => SavedComparisonListQuerySchema.parse({ page: 10_001 })).toThrow();
    expect(() => SavedComparisonListQuerySchema.parse({ pageSize: 51 })).toThrow();
    expect(() => SavedComparisonListQuerySchema.parse({ sortField: "createdAt" })).toThrow();
    expect(() => BriefSnapshotListQuerySchema.parse({ sortField: "name" })).toThrow();
    expect(SavedComparisonListQuerySchema.parse({ sortField: "name" }).sortField).toBe("name");
    expect(BriefSnapshotListQuerySchema.parse({ sortField: "updatedAt" }).sortField).toBe(
      "updatedAt",
    );
  });
});
