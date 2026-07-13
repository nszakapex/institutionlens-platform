import { beforeEach, describe, expect, it } from "vitest";
import { createAuthorizationContext } from "@/authorization/context";
import {
  DEMO_ANALYST,
  DEMO_TENANT,
  getDemoAuthorizationContext,
} from "@/authorization/demo-context";
import { permissionsForRole } from "@/authorization/policy";
import {
  buildBriefDirectoryPageView,
  buildBriefDocumentPageView,
} from "@/application/brief-service";
import { getTenantResearchReadModel } from "@/application/research-read-model";
import { briefPublicRefFor } from "@/domain/brief-public-ref";
import { DEMO_DOMAIN_TENANT_ID } from "@/domain/demo-constants";
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

function tenantBriefRef(organizationId: string) {
  return briefPublicRefFor(DEMO_DOMAIN_TENANT_ID, organizationId);
}

const FORBIDDEN =
  /org_syn_fi_|ev_syn_|prov_syn_|cap_syn_|overlay_syn_|tenant_demo|principal_demo|demo-tenant-local|demo-principal-local|Synthetic prospect flagged|private note/i;

describe("brief service Batch 1 shell", () => {
  beforeEach(() => {
    setDemoEnv();
  });

  it("lists directory candidates with opaque refs and no raw IDs", async () => {
    const view = await buildBriefDirectoryPageView(getDemoAuthorizationContext(), {});
    expect(view.state).toBe("available");
    expect(view.candidates.length).toBe(24);
    expect(view.candidates.every((item) => /^oref_/.test(item.organizationPublicRef))).toBe(true);
    expect(view.candidates.every((item) => /^bref_/.test(item.briefPublicRef))).toBe(true);
    expect(view.candidates.every((item) => item.briefHref.startsWith("/briefs/bref_"))).toBe(true);
    const names = view.candidates.map((item) => item.displayName);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
    expect(JSON.stringify(view)).not.toMatch(FORBIDDEN);
    expect(JSON.stringify(view)).not.toMatch(
      /"organizationId"|"capabilityId"|"evidenceId"|"provenanceId"/,
    );
    expect(view.manifest.nonRecommendationDisclaimer.toLowerCase()).toMatch(
      /not an investment recommendation/,
    );
  });

  it("selects an organization in the directory via opaque org query", async () => {
    const model = getTenantResearchReadModel(getDemoAuthorizationContext());
    const org = model.organizations[0];
    if (!org) throw new Error("Expected synthetic organizations");
    const view = await buildBriefDirectoryPageView(getDemoAuthorizationContext(), {
      org: org.publicRef,
    });
    expect(view.state).toBe("available");
    expect(view.selectedOrgRef).toBe(org.publicRef);
    expect(view.selectedBriefHref).toBe(`/briefs/${tenantBriefRef(org.organizationId)}`);
    expect(view.candidates.some((item) => item.selected)).toBe(true);
  });

  it("returns not_found for unknown organization public refs", async () => {
    const unknown = organizationPublicRefFor("org_syn_fi_missing_xyz");
    const view = await buildBriefDirectoryPageView(getDemoAuthorizationContext(), {
      org: unknown,
    });
    expect(view.state).toBe("not_found");
    expect(view.selectedBriefHref).toBeNull();
  });

  it("returns malformed for invalid directory query tokens", async () => {
    const view = await buildBriefDirectoryPageView(getDemoAuthorizationContext(), {
      org: "org_syn_fi_001",
    });
    expect(view.state).toBe("malformed");
    expect(view.candidates).toHaveLength(0);
  });

  it("returns unauthorized without brief:read", async () => {
    const directory = await buildBriefDirectoryPageView(withoutPermission("brief:read"), {});
    const document = await buildBriefDocumentPageView(
      withoutPermission("brief:read"),
      tenantBriefRef("org_syn_fi_001"),
    );
    expect(directory.state).toBe("unauthorized");
    expect(document.state).toBe("unauthorized");
    expect(JSON.stringify(directory)).not.toMatch(FORBIDDEN);
    expect(JSON.stringify(document)).not.toMatch(FORBIDDEN);
  });

  it("returns unauthorized without organization:read or assessment:read", async () => {
    const missingOrg = await buildBriefDirectoryPageView(
      withoutPermission("organization:read"),
      {},
    );
    const missingAssessment = await buildBriefDocumentPageView(
      withoutPermission("assessment:read"),
      tenantBriefRef("org_syn_fi_001"),
    );
    expect(missingOrg.state).toBe("unauthorized");
    expect(missingAssessment.state).toBe("unauthorized");
  });

  it("fails closed when authorization is revoked before final projection", async () => {
    const base = getDemoAuthorizationContext();
    let permissionReads = 0;
    const context = {
      tenant: base.tenant,
      principal: base.principal,
      get permissions() {
        permissionReads += 1;
        // Initial requireBriefReadAccess (3) + research-model asserts (2).
        // finalizeBriefView reasserts afterward — revoke before that recheck.
        if (permissionReads > 5) {
          return base.permissions.filter((item) => item !== "brief:read");
        }
        return base.permissions;
      },
    } as typeof base;

    const model = getTenantResearchReadModel(base);
    const org = model.organizations[0];
    if (!org) throw new Error("Expected organization");
    const briefRef = tenantBriefRef(org.organizationId);

    permissionReads = 0;
    const directory = await buildBriefDirectoryPageView(context, {});
    permissionReads = 0;
    const document = await buildBriefDocumentPageView(context, briefRef);
    expect(directory.state).toBe("unauthorized");
    expect(document.state).toBe("unauthorized");
  });

  it("resolves an available brief document shell without section leakage", async () => {
    const model = getTenantResearchReadModel(getDemoAuthorizationContext());
    const assessed = model.organizations.find((org) => org.portfolio.status === "assessed");
    if (!assessed) throw new Error("Expected assessed organization");
    const briefRef = tenantBriefRef(assessed.organizationId);
    const view = await buildBriefDocumentPageView(getDemoAuthorizationContext(), briefRef);
    expect(["available", "not_published", "insufficient_evidence"]).toContain(view.state);
    expect(view.briefPublicRef).toBe(briefRef);
    expect(view.organizationPublicRef).toBe(assessed.publicRef);
    expect(view.displayName).toBe(assessed.displayName);
    expect(view.detailHref).toBe(`/organizations/${assessed.publicRef}`);
    expect(view.title).toContain(assessed.displayName);
    expect(view.sectionPlaceholders.length).toBeGreaterThan(0);
    expect(JSON.stringify(view)).not.toMatch(FORBIDDEN);
    expect(JSON.stringify(view)).not.toMatch(
      /"organizationId"|"capabilityId"|"evidenceId"|"provenanceId"/,
    );
  });

  it("maps insufficient_evidence organizations to the matching brief state", async () => {
    const model = getTenantResearchReadModel(getDemoAuthorizationContext());
    const insufficient = model.organizations.find(
      (org) => org.portfolio.status === "insufficient_evidence",
    );
    if (!insufficient) throw new Error("Expected insufficient_evidence organization");
    const view = await buildBriefDocumentPageView(
      getDemoAuthorizationContext(),
      tenantBriefRef(insufficient.organizationId),
    );
    expect(view.state).toBe("insufficient_evidence");
    expect(view.stateMessage.toLowerCase()).toMatch(/insufficient evidence/);
    expect(view.stateMessage.toLowerCase()).toMatch(/without treating them as missing capability/);
    expect(view.stateMessage.toLowerCase()).not.toMatch(
      /missing evidence (?:is|means|equals) a missing capability/,
    );
  });

  it("returns not_found for foreign-tenant brief refs and malformed for bad tokens", async () => {
    const foreign = briefPublicRefFor("tenant_other_research_workspace", "org_syn_fi_001");
    const missing = await buildBriefDocumentPageView(getDemoAuthorizationContext(), foreign);
    const malformed = await buildBriefDocumentPageView(
      getDemoAuthorizationContext(),
      "org_syn_fi_001",
    );
    expect(missing.state).toBe("not_found");
    expect(malformed.state).toBe("malformed");
    expect(JSON.stringify(missing)).not.toMatch(FORBIDDEN);
    expect(JSON.stringify(malformed)).not.toMatch(FORBIDDEN);
  });

  it("freezes view models", async () => {
    const directory = await buildBriefDirectoryPageView(getDemoAuthorizationContext(), {});
    const briefRef = directory.candidates[0]?.briefPublicRef;
    if (!briefRef) throw new Error("Expected candidate");
    const document = await buildBriefDocumentPageView(getDemoAuthorizationContext(), briefRef);
    expect(Object.isFrozen(directory)).toBe(true);
    expect(Object.isFrozen(directory.candidates)).toBe(true);
    expect(Object.isFrozen(document)).toBe(true);
    expect(Object.isFrozen(document.sectionPlaceholders)).toBe(true);
  });
});

describe("local-demo brief permission boundary", () => {
  beforeEach(() => {
    setDemoEnv();
  });

  it("grants brief:read without draft, approve, or export permissions", () => {
    const context = getDemoAuthorizationContext();
    expect(context.permissions).toContain("brief:read");
    expect(context.permissions).not.toContain("brief:draft");
    expect(context.permissions).not.toContain("brief:approve");
    expect(context.permissions).not.toContain("export:request");
    expect(context.permissions).not.toContain("comparison:create");
    expect(context.permissions).not.toContain("evidence:restricted_read");
  });
});
