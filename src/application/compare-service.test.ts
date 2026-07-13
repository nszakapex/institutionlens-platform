import { beforeEach, describe, expect, it } from "vitest";
import { createAuthorizationContext } from "@/authorization/context";
import {
  DEMO_ANALYST,
  DEMO_TENANT,
  getDemoAuthorizationContext,
} from "@/authorization/demo-context";
import { permissionsForRole } from "@/authorization/policy";
import { buildComparePageView } from "@/application/compare-service";
import { getTenantResearchReadModel } from "@/application/research-read-model";
import { organizationPublicRefFor } from "@/domain/organization-public-ref";

function withoutPermission(permission: string) {
  return createAuthorizationContext(
    DEMO_TENANT,
    DEMO_ANALYST,
    permissionsForRole("analyst").filter((item) => item !== permission),
  );
}

function setDemoEnv(): void {
  process.env.IL_APP_MODE = "local-demo";
  process.env.IL_DEMO_TENANT_ID = "demo-tenant-local";
  process.env.IL_DEMO_PRINCIPAL_ID = "demo-principal-local";
}

function publicRefs(count: number) {
  const model = getTenantResearchReadModel(getDemoAuthorizationContext());
  return model.organizations.slice(0, count).map((org) => org.publicRef);
}

const FORBIDDEN =
  /org_syn_fi_|ev_syn_|prov_syn_|cap_syn_|overlay_syn_|tenant_demo|principal_demo|demo-tenant-local|demo-principal-local/;

describe("buildComparePageView", () => {
  beforeEach(() => {
    setDemoEnv();
  });

  it("returns empty state with no selections", async () => {
    const view = await buildComparePageView(getDemoAuthorizationContext(), {});
    expect(view.state).toBe("empty");
    expect(view.columns).toHaveLength(0);
    expect(view.compareHref).toBe("/compare");
  });

  it("returns partial for a single resolved organization", async () => {
    const [ref] = publicRefs(1);
    const view = await buildComparePageView(getDemoAuthorizationContext(), { org: ref });
    expect(view.state).toBe("partial");
    expect(view.columns).toHaveLength(1);
    expect(view.selectedRefs).toEqual([ref]);
    expect(view.compareHref).toContain(ref);
  });

  it("returns ready for two and three organizations without recalculating scores", async () => {
    const two = publicRefs(2);
    const three = publicRefs(3);
    const twoView = await buildComparePageView(getDemoAuthorizationContext(), { org: two });
    const threeView = await buildComparePageView(getDemoAuthorizationContext(), { org: three });
    expect(twoView.state).toBe("ready");
    expect(threeView.state).toBe("ready");
    expect(twoView.columns).toHaveLength(2);
    expect(threeView.columns).toHaveLength(3);
    expect(twoView.columns[0]?.capabilities.length).toBe(5);
    expect(twoView.contrastNotes.some((note) => /winner/i.test(note))).toBe(true);
  });

  it("fails closed without organization or assessment read permission", async () => {
    const refs = publicRefs(2);
    const missingOrg = await buildComparePageView(withoutPermission("organization:read"), {
      org: refs,
    });
    const missingAssessment = await buildComparePageView(withoutPermission("assessment:read"), {
      org: refs,
    });
    expect(missingOrg.state).toBe("unauthorized");
    expect(missingAssessment.state).toBe("unauthorized");
    expect(missingOrg.columns).toHaveLength(0);
  });

  it("rejects malformed and oversized selections", async () => {
    const malformed = await buildComparePageView(getDemoAuthorizationContext(), {
      org: "not-a-ref",
    });
    const refs = publicRefs(4);
    const tooMany = await buildComparePageView(getDemoAuthorizationContext(), { org: refs });
    expect(malformed.state).toBe("malformed");
    expect(tooMany.state).toBe("malformed");
  });

  it("treats unknown refs as not_found when none resolve", async () => {
    const unknown = organizationPublicRefFor("org_syn_fi_missing_zzzz");
    const view = await buildComparePageView(getDemoAuthorizationContext(), {
      org: [unknown, organizationPublicRefFor("org_syn_fi_missing_yyyy")],
    });
    expect(view.state).toBe("not_found");
    expect(view.missing.length).toBe(2);
  });

  it("keeps serialized views free of raw internal identifiers", async () => {
    const refs = publicRefs(3);
    const view = await buildComparePageView(getDemoAuthorizationContext(), { org: refs });
    const serialized = JSON.stringify(view);
    expect(serialized).not.toMatch(FORBIDDEN);
    expect(serialized).not.toMatch(/"organizationId"/);
    expect(serialized).not.toMatch(/"capabilityId"/);
    expect(serialized).not.toMatch(/"evidenceId"/);
    for (const column of view.columns) {
      expect(column.publicRef.startsWith("oref_")).toBe(true);
      expect(column.detailHref).toBe(`/organizations/${column.publicRef}`);
      expect(column.removeHref.startsWith("/compare")).toBe(true);
      expect(column.removeHref).not.toContain(column.publicRef);
    }
  });
});
