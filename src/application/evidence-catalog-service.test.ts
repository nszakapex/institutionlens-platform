import { beforeEach, describe, expect, it } from "vitest";
import { createAuthorizationContext } from "@/authorization/context";
import {
  DEMO_ANALYST,
  DEMO_TENANT,
  getDemoAuthorizationContext,
} from "@/authorization/demo-context";
import { permissionsForRole } from "@/authorization/policy";
import { buildEvidenceCatalogPageView } from "@/application/evidence-catalog-service";
import type { EvidenceCatalogRowView } from "@/application/evidence-catalog-view-models";
import { parseEvidenceCatalogSearchParams } from "@/application/evidence-catalog-query";
import { getTenantResearchReadModel } from "@/application/research-read-model";
import { organizationPublicRefFor } from "@/domain/organization-public-ref";

function contextWithoutEvidenceRead() {
  return createAuthorizationContext(
    DEMO_TENANT,
    DEMO_ANALYST,
    permissionsForRole("analyst").filter((item) => item !== "evidence:read"),
  );
}

function adminWithRestrictedEvidence() {
  return createAuthorizationContext(DEMO_TENANT, { ...DEMO_ANALYST, role: "administrator" }, [
    ...permissionsForRole("administrator"),
  ]);
}

function firstOrgRef() {
  const model = getTenantResearchReadModel(getDemoAuthorizationContext());
  return organizationPublicRefFor(model.organizations[0]!.organizationId);
}

function setDemoEnv(): void {
  process.env.IL_APP_MODE = "local-demo";
  process.env.IL_DEMO_TENANT_ID = "demo-tenant-local";
  process.env.IL_DEMO_PRINCIPAL_ID = "demo-principal-local";
}

describe("evidence catalog query", () => {
  it("parses defaults and normalized multi-select filters", () => {
    const parsed = parseEvidenceCatalogSearchParams({
      evidenceType: ["public_change_signal", "organization_profile", "public_change_signal"],
      capability: [
        "scenario-planning-support",
        "data-quality-modernization",
        "scenario-planning-support",
      ],
      ruleOutcome: ["awarded", "not_awarded"],
      pageSize: "40",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.query.view).toBe("evidence");
    expect(parsed.query.page).toBe(1);
    expect(parsed.query.pageSize).toBe(40);
    expect(parsed.query.evidenceType).toEqual(["organization_profile", "public_change_signal"]);
    expect(parsed.query.capability).toEqual([
      "data-quality-modernization",
      "scenario-planning-support",
    ]);
    expect(parsed.query.ruleOutcome).toEqual(["awarded", "not_awarded"]);
  });

  it("fails safely on excess multi-select values and invalid page sizes", () => {
    expect(
      parseEvidenceCatalogSearchParams({
        evidenceType: Array.from({ length: 9 }, (_, i) => `x${i}`),
      }).ok,
    ).toBe(false);
    expect(parseEvidenceCatalogSearchParams({ pageSize: "12" }).ok).toBe(false);
    expect(parseEvidenceCatalogSearchParams({ orgRef: "org_syn_fi_bad" }).ok).toBe(false);
    expect(parseEvidenceCatalogSearchParams({ sourceType: "unsupported" }).ok).toBe(false);
  });
});

describe("evidence catalog service", () => {
  beforeEach(() => {
    setDemoEnv();
  });

  it("requires evidence read permission", async () => {
    const view = await buildEvidenceCatalogPageView(contextWithoutEvidenceRead(), {});
    expect(view.state).toBe("unauthorized");
  });

  it("paginates evidence and provenance views without raw IDs", async () => {
    const evidence = await buildEvidenceCatalogPageView(getDemoAuthorizationContext(), {
      pageSize: "20",
      page: "1",
    });
    const provenance = await buildEvidenceCatalogPageView(getDemoAuthorizationContext(), {
      view: "provenance",
      pageSize: "20",
    });

    expect(evidence.state).toBe("ready");
    expect(provenance.state).toBe("ready");
    expect(evidence.rows.length).toBeLessThanOrEqual(20);
    expect(provenance.rows.length).toBeLessThanOrEqual(20);
    expect(evidence.pagination.nextHref).toContain("page=2");

    const serialized = JSON.stringify([evidence, provenance]);
    expect(serialized).not.toMatch(
      /org_syn_fi_|ev_syn_fi_|prov_syn_fi_|tenant_|principal_|overlay_/,
    );
    expect(serialized).not.toMatch(/notes|Synthetic prospect flagged|private note/i);
  });

  it("filters by org ref and multi-select values while ignoring tenant override params", async () => {
    const orgRef = firstOrgRef();
    const view = await buildEvidenceCatalogPageView(getDemoAuthorizationContext(), {
      orgRef,
      evidenceType: ["organization_profile", "public_change_signal"],
      tenantId: "tenant_other_demo",
      pageSize: "40",
    } as Record<string, string | string[] | undefined>);

    expect(view.state).toBe("ready");
    expect(view.unknownParams).toContain("tenantId");
    expect(view.formValues.orgRef).toBe(orgRef);
    const evidenceRows = view.rows.filter(
      (row): row is EvidenceCatalogRowView => "organizationDetailHref" in row,
    );
    expect(
      evidenceRows.every((row) => row.organizationDetailHref === `/organizations/${orgRef}`),
    ).toBe(true);
  });

  it("does not let cross-tenant org refs broaden catalog results", async () => {
    const orgRef = firstOrgRef();
    const tenant = { ...DEMO_TENANT, id: "tenant_other_demo" };
    const principal = {
      ...DEMO_ANALYST,
      id: "principal_other_demo",
      tenantId: tenant.id,
      role: "administrator" as const,
    };
    const otherContext = createAuthorizationContext(
      tenant,
      principal,
      permissionsForRole("administrator"),
    );
    const view = await buildEvidenceCatalogPageView(otherContext, { orgRef, pageSize: "20" });

    expect(view.state).toBe("ready");
    expect(view.totalCount).toBe(0);
    expect(view.rows).toHaveLength(0);
  });

  it("uses restricted placeholders unless restricted evidence permission is present", async () => {
    const analyst = await buildEvidenceCatalogPageView(getDemoAuthorizationContext(), {
      publicationEligibility: "restricted",
      pageSize: "40",
    });
    const administrator = await buildEvidenceCatalogPageView(adminWithRestrictedEvidence(), {
      publicationEligibility: "restricted",
      pageSize: "40",
    });

    expect(analyst.rows.length).toBeGreaterThan(0);
    expect(JSON.stringify(analyst.rows)).toContain("Restricted evidence");
    expect(JSON.stringify(analyst.rows)).not.toMatch(/observation|restricted source/i);
    expect(administrator.rows.some((row) => row.state === "available")).toBe(true);
  });

  it("supports capability and rule-outcome filters with AND across groups", async () => {
    const capabilityOnly = await buildEvidenceCatalogPageView(getDemoAuthorizationContext(), {
      capability: ["operational-analytics-support", "data-quality-modernization"],
      pageSize: "40",
    });
    const capabilityAndOutcome = await buildEvidenceCatalogPageView(getDemoAuthorizationContext(), {
      capability: ["operational-analytics-support", "data-quality-modernization"],
      ruleOutcome: "awarded",
      pageSize: "40",
    });
    expect(capabilityOnly.state).toBe("ready");
    expect(capabilityAndOutcome.state).toBe("ready");
    expect(capabilityOnly.totalCount).toBeGreaterThan(0);
    expect(capabilityAndOutcome.totalCount).toBeGreaterThan(0);
    expect(capabilityAndOutcome.totalCount).toBeLessThanOrEqual(capabilityOnly.totalCount);
    expect(capabilityAndOutcome.activeFilters).toHaveLength(3);
  });

  it("filters provenance fields and never searches restricted summaries without permission", async () => {
    const provenance = await buildEvidenceCatalogPageView(getDemoAuthorizationContext(), {
      view: "provenance",
      sourceType: "synthetic_fixture",
      validationStatus: "validated",
      syntheticStatus: "synthetic",
      pageSize: "40",
    });
    expect(provenance.state).toBe("ready");
    expect(provenance.rows.length).toBeGreaterThan(0);

    const sensitivePhrase = "unknown license blocks publication eligibility";
    const analyst = await buildEvidenceCatalogPageView(getDemoAuthorizationContext(), {
      q: sensitivePhrase,
      publicationEligibility: "restricted",
      pageSize: "40",
    });
    const administrator = await buildEvidenceCatalogPageView(adminWithRestrictedEvidence(), {
      q: sensitivePhrase,
      publicationEligibility: "restricted",
      pageSize: "40",
    });
    expect(analyst.totalCount).toBe(0);
    expect(administrator.totalCount).toBeGreaterThan(0);
  });
});
