import { beforeEach, describe, expect, it } from "vitest";
import { createAuthorizationContext } from "@/authorization/context";
import {
  DEMO_ANALYST,
  DEMO_TENANT,
  getDemoAuthorizationContext,
} from "@/authorization/demo-context";
import { permissionsForRole, type Action } from "@/authorization/policy";
import {
  buildBriefDirectoryPageView,
  buildBriefDocumentPageView,
} from "@/application/brief-service";
import { BRIEF_SECTION_ORDER } from "@/application/brief-view-models";
import { getTenantResearchReadModel } from "@/application/research-read-model";
import { briefPublicRefFor } from "@/domain/brief-public-ref";
import { DEMO_DOMAIN_TENANT_ID } from "@/domain/demo-constants";
import { organizationPublicRefFor } from "@/domain/organization-public-ref";
import { ASSESSED_AT } from "@/verticals/financial-institutions/assessment/methodology";

function withoutPermission(permission: Action) {
  return createAuthorizationContext(
    DEMO_TENANT,
    DEMO_ANALYST,
    permissionsForRole("analyst").filter((item) => item !== permission),
  );
}

function adminContext() {
  return createAuthorizationContext(DEMO_TENANT, { ...DEMO_ANALYST, role: "administrator" }, [
    ...permissionsForRole("administrator"),
  ]);
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

const RANKING = /\b(?:winner|top pick|recommended organization|best investment)\b/i;

describe("brief service Batch 2 projections", () => {
  beforeEach(() => {
    setDemoEnv();
  });

  it("projects an available brief with stable sections and dataset as-of", async () => {
    const model = getTenantResearchReadModel(getDemoAuthorizationContext());
    const assessed = model.organizations.find(
      (org) =>
        org.portfolio.status === "assessed" &&
        (org.portfolio.publicationEligibility === "internal_only" ||
          org.portfolio.publicationEligibility === "eligible"),
    );
    if (!assessed) throw new Error("Expected available assessed organization");
    const view = await buildBriefDocumentPageView(
      getDemoAuthorizationContext(),
      tenantBriefRef(assessed.organizationId),
    );
    expect(view.state).toBe("available");
    expect(view.sections.map((section) => section.key)).toEqual([...BRIEF_SECTION_ORDER]);
    expect(view.capabilities).toHaveLength(5);
    expect(view.asOfLabel).toBe(`As of ${ASSESSED_AT}`);
    expect(view.manifest.asAssessedAt).toBe(ASSESSED_AT);
    expect(ASSESSED_AT.startsWith("2026-04-01")).toBe(true);
    expect(view.sections.every((section) => section.observations.every((item) => item.key))).toBe(
      true,
    );
    expect(JSON.stringify(view)).not.toMatch(FORBIDDEN);
    expect(JSON.stringify(view)).not.toMatch(RANKING);
    expect(JSON.stringify(view)).not.toMatch(
      /"organizationId"|"capabilityId"|"evidenceId"|"provenanceId"|"notes"/,
    );
  });

  it("keeps output deterministic and section order stable", async () => {
    const model = getTenantResearchReadModel(getDemoAuthorizationContext());
    const assessed = model.organizations.find((org) => org.portfolio.status === "assessed");
    if (!assessed) throw new Error("Expected assessed organization");
    const briefRef = tenantBriefRef(assessed.organizationId);
    const first = await buildBriefDocumentPageView(getDemoAuthorizationContext(), briefRef);
    const second = await buildBriefDocumentPageView(getDemoAuthorizationContext(), briefRef);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.sections.map((section) => section.key)).toEqual([...BRIEF_SECTION_ORDER]);
    expect(first.sections.map((section) => section.observations.map((item) => item.key))).toEqual(
      second.sections.map((section) => section.observations.map((item) => item.key)),
    );
  });

  it("maps insufficient_evidence without capability-absence or suppressed numeric claims", async () => {
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
    expect(view.stateMessage.toLowerCase()).toMatch(/missing evidence as a missing capability/);
    expect(JSON.stringify(view).toLowerCase()).not.toMatch(
      /missing evidence (?:is|means|equals) a missing capability/,
    );
    expect(view.capabilities.every((item) => item.pointsAwarded === null)).toBe(true);
    const blob = JSON.stringify(view).toLowerCase();
    expect(blob).not.toMatch(RANKING);
    expect(blob).not.toMatch(FORBIDDEN);
  });

  it("maps not_published without exposing suppressed assessment details", async () => {
    const model = getTenantResearchReadModel(getDemoAuthorizationContext());
    const withheld = model.organizations.find(
      (org) =>
        org.portfolio.status === "assessed" &&
        org.portfolio.publicationEligibility !== "eligible" &&
        org.portfolio.publicationEligibility !== "internal_only",
    );
    if (!withheld) throw new Error("Expected not_published organization");
    const view = await buildBriefDocumentPageView(
      getDemoAuthorizationContext(),
      tenantBriefRef(withheld.organizationId),
    );
    expect(view.state).toBe("not_published");
    expect(view.capabilities.every((item) => item.pointsAwarded === null)).toBe(true);
    const gaps = view.sections.find((section) => section.key === "gaps");
    expect(gaps?.observations.some((item) => item.classification === "not_published")).toBe(true);
    expect(JSON.stringify(view)).not.toMatch(/\b\d+ of \d+ points\b/);
    expect(JSON.stringify(view)).not.toMatch(FORBIDDEN);
  });

  it("handles mixed capability publication states without inventing numeric fit", async () => {
    const model = getTenantResearchReadModel(getDemoAuthorizationContext());
    const mixed = model.organizations.find((org) =>
      org.capabilityAssessments.some(
        (assessment) =>
          assessment.publicationEligibility !== "eligible" &&
          assessment.publicationEligibility !== "internal_only",
      ),
    );
    if (!mixed) throw new Error("Expected mixed capability publication org");
    const view = await buildBriefDocumentPageView(
      getDemoAuthorizationContext(),
      tenantBriefRef(mixed.organizationId),
    );
    expect(view.capabilities.length).toBe(5);
    if (view.state === "available") {
      const withheld = view.capabilities.filter(
        (item) => item.publicationEligibility === "unavailable" || item.pointsAwarded === null,
      );
      expect(withheld.length).toBeGreaterThan(0);
    }
    expect(JSON.stringify(view)).not.toMatch(FORBIDDEN);
  });

  it("links evidence-backed observations to permitted provenance labels", async () => {
    const model = getTenantResearchReadModel(getDemoAuthorizationContext());
    const assessed = model.organizations.find((org) => org.portfolio.status === "assessed");
    if (!assessed) throw new Error("Expected assessed organization");
    const view = await buildBriefDocumentPageView(
      getDemoAuthorizationContext(),
      tenantBriefRef(assessed.organizationId),
    );
    if (view.state !== "available") return;
    const observations = view.sections.find((section) => section.key === "observations");
    expect(observations).toBeTruthy();
    const linked = observations!.observations.filter(
      (item) => item.classification === "evidence" && item.supportingEvidenceTitles.length > 0,
    );
    expect(linked.length).toBeGreaterThan(0);
    expect(
      linked.every(
        (item) =>
          item.supportingProvenanceLabels.length === 0 ||
          item.supportingProvenanceLabels.every((label) => !/prov_syn_/.test(label)),
      ),
    ).toBe(true);
  });

  it("filters restricted evidence before counts without revealing withheld existence", async () => {
    const model = getTenantResearchReadModel(getDemoAuthorizationContext());
    const withRestricted = model.organizations.find((org) => org.portfolio.status === "assessed");
    if (!withRestricted) throw new Error("Expected assessed organization");
    const briefRef = tenantBriefRef(withRestricted.organizationId);
    const analyst = await buildBriefDocumentPageView(getDemoAuthorizationContext(), briefRef);
    const admin = await buildBriefDocumentPageView(adminContext(), briefRef);
    expect(analyst.state).not.toBe("error");
    expect(admin.state).not.toBe("error");
    if (analyst.evidenceCoverage && admin.evidenceCoverage) {
      expect(admin.evidenceCoverage.permittedCount).toBeGreaterThanOrEqual(
        analyst.evidenceCoverage.permittedCount,
      );
    }
    expect(JSON.stringify(analyst).toLowerCase()).not.toMatch(
      /restricted evidence exists|withheld without evidence:restricted_read/,
    );
    expect(JSON.stringify(analyst)).not.toMatch(FORBIDDEN);
    expect(JSON.stringify(admin)).not.toMatch(/Synthetic prospect flagged|private note/i);
  });

  it("requires evidence classification rows to carry permitted supporting titles", async () => {
    const model = getTenantResearchReadModel(getDemoAuthorizationContext());
    const assessed = model.organizations.find((org) => org.portfolio.status === "assessed");
    if (!assessed) throw new Error("Expected assessed organization");
    const view = await buildBriefDocumentPageView(
      getDemoAuthorizationContext(),
      tenantBriefRef(assessed.organizationId),
    );
    if (view.state !== "available") return;
    for (const section of view.sections) {
      for (const item of section.observations) {
        if (item.classification === "evidence") {
          expect(item.supportingEvidenceTitles.length).toBeGreaterThan(0);
        }
        if (item.classification === "assessment") {
          expect(item.language.toLowerCase()).toMatch(
            /assessment output|existing assessment|as of|freshness from the existing assessment/,
          );
        }
      }
    }
  });

  it("exposes only overlay access state when overlay:read is denied", async () => {
    const model = getTenantResearchReadModel(getDemoAuthorizationContext());
    const withOverlay = model.organizations.find((org) => org.overlay !== null);
    if (!withOverlay) throw new Error("Expected organization with overlay");
    const denied = await buildBriefDocumentPageView(
      withoutPermission("overlay:read"),
      tenantBriefRef(withOverlay.organizationId),
    );
    const allowed = await buildBriefDocumentPageView(
      getDemoAuthorizationContext(),
      tenantBriefRef(withOverlay.organizationId),
    );
    expect(denied.overlay).toEqual({ access: "restricted" });
    expect(Object.keys(denied.overlay ?? {})).toEqual(["access"]);
    expect(JSON.stringify(denied)).not.toMatch(/prospect|active_client|former_client|excluded/);
    expect(allowed.overlay?.access).toBe("available");
    expect(JSON.stringify(allowed)).not.toMatch(/Synthetic prospect flagged|private note|"notes"/);
  });

  it("fails closed for unauthorized, not_found, malformed, and mid-request auth loss", async () => {
    const unauthorized = await buildBriefDocumentPageView(
      withoutPermission("brief:read"),
      tenantBriefRef("org_syn_fi_001"),
    );
    expect(unauthorized.state).toBe("unauthorized");
    expect(unauthorized.sections).toHaveLength(0);

    const malformed = await buildBriefDocumentPageView(
      getDemoAuthorizationContext(),
      "org_syn_fi_001",
    );
    expect(malformed.state).toBe("malformed");

    const foreign = await buildBriefDocumentPageView(
      getDemoAuthorizationContext(),
      briefPublicRefFor("tenant_other_research_workspace", "org_syn_fi_001"),
    );
    expect(foreign.state).toBe("not_found");

    const base = getDemoAuthorizationContext();
    let permissionReads = 0;
    const context = {
      tenant: base.tenant,
      principal: base.principal,
      get permissions() {
        permissionReads += 1;
        if (permissionReads > 5) {
          return base.permissions.filter((item) => item !== "brief:read");
        }
        return base.permissions;
      },
    } as typeof base;
    const model = getTenantResearchReadModel(base);
    const org = model.organizations[0];
    if (!org) throw new Error("Expected organization");
    permissionReads = 0;
    const revoked = await buildBriefDocumentPageView(context, tenantBriefRef(org.organizationId));
    expect(revoked.state).toBe("unauthorized");
  });

  it("keeps directory shell and freezes projected documents", async () => {
    const directory = await buildBriefDirectoryPageView(getDemoAuthorizationContext(), {});
    expect(directory.state).toBe("available");
    expect(directory.candidates).toHaveLength(24);
    const briefRef = directory.candidates[0]?.briefPublicRef;
    if (!briefRef) throw new Error("Expected candidate");
    const document = await buildBriefDocumentPageView(getDemoAuthorizationContext(), briefRef);
    expect(Object.isFrozen(directory)).toBe(true);
    expect(Object.isFrozen(document)).toBe(true);
    expect(Object.isFrozen(document.sections)).toBe(true);
    expect(Object.isFrozen(document.capabilities)).toBe(true);
  });

  it("does not recalculate Phase 4 scores relative to the research read model", async () => {
    const model = getTenantResearchReadModel(getDemoAuthorizationContext());
    const assessed = model.organizations.find(
      (org) =>
        org.portfolio.status === "assessed" &&
        org.portfolio.portfolioPriorityScore &&
        (org.portfolio.publicationEligibility === "internal_only" ||
          org.portfolio.publicationEligibility === "eligible"),
    );
    if (!assessed?.portfolio.portfolioPriorityScore) {
      throw new Error("Expected scored assessed organization");
    }
    const view = await buildBriefDocumentPageView(
      getDemoAuthorizationContext(),
      tenantBriefRef(assessed.organizationId),
    );
    expect(view.state).toBe("available");
    const portfolio = view.sections.find((section) => section.key === "portfolio");
    expect(portfolio?.observations.some((item) => item.key === "brief.portfolio.score")).toBe(true);
    expect(
      portfolio?.observations.find((item) => item.key === "brief.portfolio.score")?.language,
    ).toContain(String(assessed.portfolio.portfolioPriorityScore.pointsAwarded));
    expect(
      portfolio?.observations.find((item) => item.key === "brief.portfolio.score")?.language,
    ).toContain(String(assessed.portfolio.portfolioPriorityScore.pointsPossible));
  });

  it("rejects unknown org directory refs and grants demo brief:read without mutations", async () => {
    const unknown = await buildBriefDirectoryPageView(getDemoAuthorizationContext(), {
      org: organizationPublicRefFor("org_syn_fi_missing_xyz"),
    });
    expect(unknown.state).toBe("not_found");
    const context = getDemoAuthorizationContext();
    expect(context.permissions).toContain("brief:read");
    expect(context.permissions).not.toContain("brief:draft");
    expect(context.permissions).not.toContain("brief:approve");
    expect(context.permissions).not.toContain("export:request");
  });
});
