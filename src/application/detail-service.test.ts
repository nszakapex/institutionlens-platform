import { beforeEach, describe, expect, it } from "vitest";
import { createAuthorizationContext } from "@/authorization/context";
import {
  DEMO_ANALYST,
  DEMO_TENANT,
  getDemoAuthorizationContext,
} from "@/authorization/demo-context";
import { permissionsForRole } from "@/authorization/policy";
import {
  buildOrganizationDetailPageView,
  resolveOrganizationByPublicRef,
} from "@/application/detail-service";
import {
  getTenantResearchReadModel,
  type TenantResearchReadModel,
} from "@/application/research-read-model";
import { organizationPublicRefFor } from "@/domain/organization-public-ref";

function withoutPermission(permission: string) {
  return createAuthorizationContext(
    DEMO_TENANT,
    DEMO_ANALYST,
    permissionsForRole("analyst").filter((item) => item !== permission),
  );
}

function adminWithRestrictedEvidence() {
  return createAuthorizationContext(DEMO_TENANT, { ...DEMO_ANALYST, role: "administrator" }, [
    ...permissionsForRole("administrator"),
  ]);
}

function otherTenantContext() {
  const tenant = { ...DEMO_TENANT, id: "tenant_other_demo" };
  const principal = {
    ...DEMO_ANALYST,
    id: "principal_other_demo",
    tenantId: tenant.id,
    role: "administrator" as const,
  };
  return createAuthorizationContext(tenant, principal, permissionsForRole("administrator"));
}

function setDemoEnv(): void {
  process.env.IL_APP_MODE = "local-demo";
  process.env.IL_DEMO_TENANT_ID = "demo-tenant-local";
  process.env.IL_DEMO_PRINCIPAL_ID = "demo-principal-local";
}

type OrgRecord = TenantResearchReadModel["organizations"][number];

async function firstPublicRefWhere(predicate: (org: OrgRecord) => boolean) {
  const model = await getTenantResearchReadModel(getDemoAuthorizationContext());
  const org = model.organizations.find(predicate);
  expect(org).toBeTruthy();
  return organizationPublicRefFor(org!.organizationId);
}

describe("organization detail service", () => {
  beforeEach(() => {
    setDemoEnv();
  });

  it("resolves public refs within the active tenant only", async () => {
    const context = getDemoAuthorizationContext();
    const ref = await firstPublicRefWhere((org) => org.portfolio.status === "assessed");

    expect((await resolveOrganizationByPublicRef(context, ref))?.displayName).toBeTruthy();

    const crossTenant = await buildOrganizationDetailPageView(otherTenantContext(), ref);
    expect(crossTenant.state).toBe("not_found");
    expect(JSON.stringify(crossTenant)).not.toContain(ref);
  });

  it("never treats a valid public ref as authorization", async () => {
    const ref = await firstPublicRefWhere((org) => org.portfolio.status === "assessed");
    const view = await buildOrganizationDetailPageView(withoutPermission("organization:read"), ref);
    expect(view.state).toBe("unauthorized");
    expect(JSON.stringify(view)).not.toContain(ref);
    expect(JSON.stringify(view)).not.toMatch(/compareHref|\/compare\?org=/);
    expect(JSON.stringify(view)).not.toMatch(/briefHref|\/briefs\/bref_/);
  });

  it("omits Brief inbound action when brief:read is missing", async () => {
    const ref = await firstPublicRefWhere((org) => org.portfolio.status === "assessed");
    const view = await buildOrganizationDetailPageView(withoutPermission("brief:read"), ref);
    expect(view.state).toBe("ok");
    if (view.state !== "ok") return;
    expect(view.header.briefHref).toBeNull();
    expect(view.header.briefActionLabel).toBeNull();
    expect(view.header.compareHref).toMatch(/^\/compare\?org=/);
    expect(JSON.stringify(view)).not.toMatch(/\/briefs\/bref_/);
  });

  it("returns malformed for invalid route references", async () => {
    const view = await buildOrganizationDetailPageView(
      getDemoAuthorizationContext(),
      "org_syn_fi_bad",
    );
    expect(view.state).toBe("malformed");
    expect(JSON.stringify(view)).not.toMatch(/org_syn_fi_bad|org_/);
  });

  it("builds complete assessed and insufficient detail views without raw IDs", async () => {
    const assessedRef = await firstPublicRefWhere((org) => org.portfolio.status === "assessed");
    const insufficientRef = await firstPublicRefWhere(
      (org) => org.portfolio.status === "insufficient_evidence",
    );

    const assessed = await buildOrganizationDetailPageView(
      getDemoAuthorizationContext(),
      assessedRef,
    );
    const insufficient = await buildOrganizationDetailPageView(
      getDemoAuthorizationContext(),
      insufficientRef,
    );

    expect(assessed.state).toBe("ok");
    expect(insufficient.state).toBe("ok");
    if (assessed.state !== "ok" || insufficient.state !== "ok") return;

    expect(assessed.header.detailHref).toBe(`/organizations/${assessedRef}`);
    expect(assessed.header.compareHref).toBe(`/compare?org=${assessedRef}`);
    expect(assessed.header.compareActionLabel).toBe(
      `Add ${assessed.header.displayName} to comparison`,
    );
    expect(assessed.header.compareHref).not.toMatch(/org_syn_fi_|tenant_|principal_/);
    expect(assessed.header.briefHref).toMatch(/^\/briefs\/bref_[a-f0-9]{16,32}$/);
    expect(assessed.header.briefActionLabel).toBe(
      `Open institutional brief for ${assessed.header.displayName}`,
    );
    expect(assessed.header.briefHref).not.toMatch(/org_syn_fi_|tenant_|principal_/);
    expect(assessed.header.displayName).toBeTruthy();
    expect(assessed.portfolioSummary.statusLabel).toBe("Assessed");
    expect(insufficient.portfolioSummary.statusLabel).toBe("Insufficient evidence");
    expect(assessed.capabilities).toHaveLength(5);
    expect(insufficient.capabilities).toHaveLength(5);
    expect(assessed.capabilities.every((cap) => cap.ledgerRows.length > 0)).toBe(true);
    expect(assessed.capabilities.flatMap((cap) => cap.ledgerRows)).toHaveLength(30);
    expect(assessed.capabilities.map((cap) => cap.priority)).toEqual(
      [...assessed.capabilities.map((cap) => cap.priority)].sort((a, b) => b - a),
    );
    expect(assessed.profile.facts.map((fact) => fact.label)).toEqual(
      expect.arrayContaining([
        "Institution kind",
        "Operating regions",
        "Lending breadth",
        "Operating complexity",
        "Regulatory-data availability",
        "Data classification",
      ]),
    );
    expect(insufficient.portfolioSummary.conditionalScore).toBeUndefined();
    expect(insufficient.portfolioSummary.insufficiencyExplanation).toMatch(/not negative fit/i);
    expect(
      insufficient.capabilities
        .filter((cap) => cap.statusLabel === "Insufficient evidence")
        .every((cap) => cap.pointsAwarded === undefined && cap.bandLabel === undefined),
    ).toBe(true);
    expect(
      assessed.capabilities.every(
        (cap) =>
          cap.factorContributions.length > 0 &&
          cap.requiredEvidenceGateStatus.length > 0 &&
          cap.limitations.some((item) => /human judgment/i.test(item)),
      ),
    ).toBe(true);
    expect(assessed.fingerprint.label).toMatch(/not a signature/i);
    expect(assessed.fingerprint.value).toMatch(/^[a-f0-9]{12}$/);
    expect(assessed.manifest.determinismVerified).toBe(true);
    expect(assessed.manifest.engineVersion).toBeTruthy();
    expect(assessed.manifest.adapterVersion).toBeTruthy();
    expect(
      assessed.signals.rows.length + assessed.signals.unknownDateRows.length,
    ).toBeLessThanOrEqual(12);

    const serialized = JSON.stringify([assessed, insufficient]);
    expect(serialized).not.toMatch(
      /org_syn_fi_|ev_syn_fi_|prov_syn_fi_|assess_syn_fi_|overlay_syn_fi_|tenant_|principal_|ledger_|rule_syn_|ruleset_syn_|cap_syn_fi_/,
    );
    expect(serialized).toContain("/organizations/oref_");
  });

  it("shows overlay fields only with overlay permission and never exposes notes", async () => {
    const ref = await firstPublicRefWhere((org) => org.overlay !== null);
    const noOverlay = await buildOrganizationDetailPageView(withoutPermission("overlay:read"), ref);
    const withOverlay = await buildOrganizationDetailPageView(getDemoAuthorizationContext(), ref);

    expect(noOverlay.state).toBe("ok");
    expect(withOverlay.state).toBe("ok");
    if (noOverlay.state !== "ok" || withOverlay.state !== "ok") return;

    expect(noOverlay.overlay.state).toBe("restricted");
    expect(JSON.stringify(noOverlay.overlay)).not.toMatch(
      /prospect|active_client|former_client|excluded/,
    );
    expect(withOverlay.overlay.state).toBe("available");
    expect(JSON.stringify(withOverlay.overlay)).not.toMatch(
      /notes|Synthetic prospect flagged|private note/i,
    );
    expect(withOverlay.portfolioSummary.conditionalScore).toEqual(
      noOverlay.portfolioSummary.conditionalScore,
    );
  });

  it("treats absent overlay as unknown tenant context", async () => {
    const ref = await firstPublicRefWhere((org) => org.overlay === null);
    const view = await buildOrganizationDetailPageView(getDemoAuthorizationContext(), ref);
    expect(view.state).toBe("ok");
    if (view.state !== "ok") return;
    expect(view.overlay.state).toBe("omitted");
    expect(JSON.stringify(view.overlay)).toMatch(/remain unknown/i);
    expect(JSON.stringify(view.overlay)).not.toMatch(/new.logo|prospect/i);
  });

  it("allows profile assessment without evidence permission but fails evidence closed", async () => {
    const ref = await firstPublicRefWhere((org) => org.portfolio.status === "assessed");
    const view = await buildOrganizationDetailPageView(withoutPermission("evidence:read"), ref);
    expect(view.state).toBe("ok");
    if (view.state !== "ok") return;
    expect(view.header.displayName).toBeTruthy();
    expect(view.evidence.state).toBe("restricted");
    expect(view.provenance.cards).toHaveLength(0);
    expect(
      view.capabilities
        .flatMap((capability) => capability.ledgerRows)
        .filter((row) => row.outcomeLabel === "Awarded")
        .every((row) => row.lineage.every((item) => /restricted/i.test(item))),
    ).toBe(true);
  });

  it("redacts restricted evidence for analysts and reveals safe metadata with restricted permission", async () => {
    const ref = await firstPublicRefWhere((org) =>
      org.capabilityAssessments.some((assessment) =>
        assessment.ledger.some((entry) => entry.publicationEligibility === "restricted"),
      ),
    );

    const analyst = await buildOrganizationDetailPageView(getDemoAuthorizationContext(), ref);
    const administrator = await buildOrganizationDetailPageView(adminWithRestrictedEvidence(), ref);

    expect(analyst.state).toBe("ok");
    expect(administrator.state).toBe("ok");
    if (analyst.state !== "ok" || administrator.state !== "ok") return;

    expect(JSON.stringify(analyst.evidence.cards)).toContain("Restricted evidence");
    expect(JSON.stringify(analyst.evidence.cards)).not.toMatch(/restricted source|observation/i);
    expect(administrator.evidence.cards.some((card) => card.state === "available")).toBe(true);
    expect(JSON.stringify(administrator.evidence.cards)).not.toMatch(/ev_syn_fi_|prov_syn_fi_/);
  });

  it("includes awarded lineage and keeps overlay independent from fit", async () => {
    const ref = await firstPublicRefWhere(
      (org) =>
        org.overlay !== null &&
        org.capabilityAssessments.some((cap) =>
          cap.ledger.some((entry) => entry.outcome === "awarded"),
        ),
    );

    const view = await buildOrganizationDetailPageView(getDemoAuthorizationContext(), ref);
    expect(view.state).toBe("ok");
    if (view.state !== "ok") return;

    const awarded = view.capabilities.flatMap((cap) =>
      cap.ledgerRows.filter((row) => row.outcomeLabel === "Awarded"),
    );
    expect(awarded.length).toBeGreaterThan(0);
    expect(awarded.every((row) => row.lineage.length > 0)).toBe(true);
    expect(view.overlay.state).toBe("available");
    expect(view.portfolioSummary.disclaimer).toMatch(/not deal probabilities/i);
  });

  it("preserves evidence semantics, provenance safety, and chronological signals", async () => {
    const model = await getTenantResearchReadModel(getDemoAuthorizationContext());
    const details = await Promise.all(
      model.organizations.map((org) =>
        buildOrganizationDetailPageView(getDemoAuthorizationContext(), org.publicRef),
      ),
    );
    const ready = details.flatMap((view) => (view.state === "ok" ? [view] : []));
    const evidence = ready.flatMap((view) =>
      view.evidence.state === "available" ? view.evidence.cards : [],
    );
    const missing = evidence.find(
      (card) => card.state === "available" && card.epistemicStatusLabel === "missing",
    );
    if (missing?.state === "available") {
      expect(missing.observationLabel).toBeNull();
    }
    const calculated = evidence.find(
      (card) => card.state === "available" && card.epistemicStatusLabel === "calculated",
    );
    if (calculated?.state === "available") {
      expect(calculated.calculatedInputDescription).toBeTruthy();
    }
    expect(
      evidence.some((card) => card.state === "available" && card.supportedRuleTitles.length > 1),
    ).toBe(true);
    expect(
      ready
        .flatMap((view) => view.provenance.cards)
        .every(
          (source) =>
            !/synthetic:\/\//i.test(JSON.stringify(source)) &&
            /architecture validation only/i.test(source.notes),
        ),
    ).toBe(true);
    for (const view of ready) {
      const dated = view.signals.rows
        .map((row) => row.observedAtLabel)
        .filter((value) => value !== "Not provided");
      expect(dated).toEqual([...dated].sort((a, b) => b.localeCompare(a)));
    }
  });
});
