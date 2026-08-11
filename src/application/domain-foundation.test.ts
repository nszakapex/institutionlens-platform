import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getDemoAuthorizationContext } from "@/authorization/demo-context";
import { buildDomainFoundationView } from "@/application/domain-foundation";
import {
  EVIDENCE_STATE_COVERAGE_DEFINITION,
  SYNTHETIC_VERIFIED_CLARIFICATION,
} from "@/domain/view-models";

function setDemoEnv(): void {
  process.env.IL_APP_MODE = "local-demo";
  process.env.IL_DEMO_TENANT_ID = "demo-tenant-local";
  process.env.IL_DEMO_PRINCIPAL_ID = "demo-principal-local";
}

describe("buildDomainFoundationView", () => {
  beforeEach(() => {
    setDemoEnv();
  });

  it("summarizes the Phase 3 synthetic domain foundation", () => {
    const view = buildDomainFoundationView(getDemoAuthorizationContext());

    expect(view.organizationCount).toBe(24);
    expect(view.fitStatus).toBe("unassessed");
    expect(view.formalCompleteness).toBe("unknown");
    expect(view.adapter).toEqual({
      verticalId: "financial_institutions",
      version: "1.0.0",
      displayName: "Financial institutions (synthetic)",
      registered: true,
    });
    expect(view.sampleOrganizations).toHaveLength(3);
    expect(view.sampleOrganizations.every((org) => org.fitStatus === "unassessed")).toBe(true);
    expect(view.evidence.total).toBeGreaterThanOrEqual(24);
    expect(view.evidence.evidenceStateCoverage.label).toBe("Evidence-state coverage");
    expect(view.evidence.evidenceStateCoverage.definition).toBe(EVIDENCE_STATE_COVERAGE_DEFINITION);
  });

  it("keeps the synthetic declaration and verified clarification visible in the view model", () => {
    const view = buildDomainFoundationView(getDemoAuthorizationContext());
    expect(view.declaration).toMatch(/entirely synthetic/i);
    expect(view.verifiedClarification).toBe(SYNTHETIC_VERIFIED_CLARIFICATION);
    expect(view.verifiedClarification).toMatch(/does not mean a real institution/i);
    expect(view.evidence.evidenceStateCoverage.byEpistemicStatus.verified).toBeGreaterThan(0);
  });

  it("does not expose raw tenant or principal IDs, provenance refs, or payloads", () => {
    const view = buildDomainFoundationView(getDemoAuthorizationContext());
    const serialized = JSON.stringify(view);

    expect(view.tenantDisplayName).toBe("Andrew Davidson research workspace");
    expect(serialized).not.toContain("tenant_demo_research");
    expect(serialized).not.toContain("principal_demo");
    expect(serialized).not.toContain("synthetic://");
    expect(serialized).not.toContain("verticalPayload");
    expect(serialized).not.toContain("organization:read");
  });
});

describe("evidence coverage labeling", () => {
  it("does not label evidence-derived coverage as Completeness", () => {
    const ui = readFileSync(
      path.join(process.cwd(), "src/components/shell/DomainFoundationStatus.tsx"),
      "utf8",
    );
    const app = readFileSync(
      path.join(process.cwd(), "src/application/domain-foundation.ts"),
      "utf8",
    );
    const views = readFileSync(path.join(process.cwd(), "src/domain/view-models.ts"), "utf8");

    expect(ui).toContain("coverage.label");
    expect(ui).toContain("Formal completeness");
    expect(ui).toContain("Completeness unknown");
    expect(ui).toContain("Unknown — not assigned in Phase 3");
    expect(ui).toContain("evidenceStateCoverage");
    // Must not present the evidence-derived summary under a Completeness heading.
    expect(ui).not.toMatch(/<dt>\{\s*["']Completeness["']\s*\}<\/dt>/);
    expect(ui).not.toMatch(/<dt>Completeness<\/dt>/);

    expect(app).not.toContain("byCompletenessProxy");
    expect(app).not.toContain("completenessProxy");
    expect(views).toContain('label: "Evidence-state coverage"');
    expect(views).toContain("formalCompleteness");
    expect(views).not.toContain("byCompletenessProxy");
  });
});
