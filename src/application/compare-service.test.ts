import { beforeEach, describe, expect, it } from "vitest";
import { createAuthorizationContext } from "@/authorization/context";
import {
  DEMO_ANALYST,
  DEMO_TENANT,
  getDemoAuthorizationContext,
} from "@/authorization/demo-context";
import { permissionsForRole } from "@/authorization/policy";
import { buildComparePageView } from "@/application/compare-service";
import { COMPARE_DIFFERENCE_STATE_LABELS } from "@/application/compare-view-models";
import { getTenantResearchReadModel } from "@/application/research-read-model";
import { organizationPublicRefFor } from "@/domain/organization-public-ref";

function withoutPermission(permission: string) {
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

async function publicRefs(count: number) {
  const model = await getTenantResearchReadModel(getDemoAuthorizationContext());
  return model.organizations.slice(0, count).map((org) => org.publicRef);
}

async function refsWithMixedAssessmentStates() {
  const model = await getTenantResearchReadModel(getDemoAuthorizationContext());
  const assessed = model.organizations.find((org) => org.portfolio.status === "assessed");
  const insufficient = model.organizations.find(
    (org) => org.portfolio.status === "insufficient_evidence",
  );
  if (!assessed || !insufficient) {
    throw new Error("Expected assessed and insufficient_evidence organizations in synthetic set");
  }
  return [assessed.publicRef, insufficient.publicRef] as const;
}

const FORBIDDEN =
  /org_syn_fi_|ev_syn_|prov_syn_|cap_syn_|overlay_syn_|tenant_demo|principal_demo|demo-tenant-local|demo-principal-local|Synthetic prospect flagged|private note/i;

describe("buildComparePageView Batch 2 projections", () => {
  beforeEach(() => {
    setDemoEnv();
  });

  it("returns empty, partial, and ready states for 0/1/2/3 organizations", async () => {
    const empty = await buildComparePageView(getDemoAuthorizationContext(), {});
    const [one] = await publicRefs(1);
    const partial = await buildComparePageView(getDemoAuthorizationContext(), { org: one });
    const two = await buildComparePageView(getDemoAuthorizationContext(), {
      org: await publicRefs(2),
    });
    const three = await buildComparePageView(getDemoAuthorizationContext(), {
      org: await publicRefs(3),
    });
    expect(empty.state).toBe("empty");
    expect(partial.state).toBe("partial");
    expect(two.state).toBe("ready");
    expect(three.state).toBe("ready");
    expect(two.columns).toHaveLength(2);
    expect(three.columns).toHaveLength(3);
    expect(two.differences.length).toBeGreaterThan(0);
    expect(three.differences.length).toBeGreaterThan(0);
  });

  it("exposes redacted candidates for selection without raw IDs", async () => {
    const [one] = await publicRefs(1);
    const empty = await buildComparePageView(getDemoAuthorizationContext(), {});
    const partial = await buildComparePageView(getDemoAuthorizationContext(), { org: one });
    expect(empty.candidates.length).toBeGreaterThan(2);
    expect(partial.candidates.some((candidate) => candidate.selected)).toBe(true);
    expect(partial.candidates.filter((candidate) => candidate.selected)).toHaveLength(1);
    const names = empty.candidates.map((candidate) => candidate.displayName);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
    expect(JSON.stringify(empty.candidates)).not.toMatch(FORBIDDEN);
    expect(JSON.stringify(empty.candidates)).not.toMatch(
      /"organizationId"|"capabilityId"|"evidenceId"/,
    );
    expect(empty.candidates.every((candidate) => /^oref_/.test(candidate.publicRef))).toBe(true);
  });

  it("keeps column order as URL selection order without ranking by score", async () => {
    const refs = await publicRefs(3);
    const reversed = [...refs].reverse();
    const forward = await buildComparePageView(getDemoAuthorizationContext(), { org: refs });
    const backward = await buildComparePageView(getDemoAuthorizationContext(), { org: reversed });
    expect(forward.state).toBe("ready");
    expect(backward.state).toBe("ready");
    expect(forward.columns.map((column) => column.publicRef)).toEqual(refs);
    expect(backward.columns.map((column) => column.publicRef)).toEqual(reversed);
    expect(forward.compareHref).toBe(`/compare?org=${refs[0]}&org=${refs[1]}&org=${refs[2]}`);
    expect(backward.compareHref).toBe(
      `/compare?org=${reversed[0]}&org=${reversed[1]}&org=${reversed[2]}`,
    );
    const scores = forward.columns.map((column) => column.conditionalScore?.pointsAwarded ?? -1);
    const sortedByScore = [...scores].sort((a, b) => b - a);
    // Column order must not silently become score rank even when scores differ.
    if (new Set(scores).size > 1) {
      expect(scores).not.toEqual(sortedByScore);
    }
    expect(JSON.stringify(forward)).not.toMatch(
      /\b(?:winner|top pick|recommended organization)\b/i,
    );
  });

  it("canonicalizes add, remove, replace, duplicate, and max-three selections", async () => {
    const refs = await publicRefs(4);
    expect(refs).toHaveLength(4);
    const [a, b, c, d] = refs as [string, string, string, string];
    const two = await buildComparePageView(getDemoAuthorizationContext(), { org: [a, b] });
    expect(two.compareHref).toBe(`/compare?org=${a}&org=${b}`);
    expect(two.columns[0]!.removeHref).toBe(`/compare?org=${b}`);
    expect(two.columns[1]!.removeHref).toBe(`/compare?org=${a}`);
    for (const column of two.columns) {
      expect(column.briefHref).toMatch(/^\/briefs\/bref_[a-f0-9]{16,32}$/);
      expect(column.briefActionLabel).toBe(`Open institutional brief for ${column.displayName}`);
      expect(column.briefHref).not.toMatch(/org_syn_fi_|tenant_|principal_/);
    }

    const withoutBrief = await buildComparePageView(withoutPermission("brief:read"), {
      org: [a, b],
    });
    expect(withoutBrief.compareHref).toBe(`/compare?org=${a}&org=${b}`);
    expect(withoutBrief.columns).toHaveLength(2);
    for (const column of withoutBrief.columns) {
      expect(column.briefHref).toBeNull();
      expect(column.briefActionLabel).toBeNull();
    }
    expect(JSON.stringify(withoutBrief)).not.toMatch(/\/briefs\/bref_/);

    const replaced = await buildComparePageView(getDemoAuthorizationContext(), {
      org: [a, c],
    });
    expect(replaced.compareHref).toBe(`/compare?org=${a}&org=${c}`);
    expect(replaced.columns.map((column) => column.publicRef)).toEqual([a, c]);

    const deduped = await buildComparePageView(getDemoAuthorizationContext(), {
      org: [a, a, b, a],
    });
    expect(deduped.compareHref).toBe(`/compare?org=${a}&org=${b}`);
    expect(deduped.columns).toHaveLength(2);

    const capped = await buildComparePageView(getDemoAuthorizationContext(), {
      org: [a, b, c],
    });
    expect(capped.columns).toHaveLength(3);
    expect(capped.compareHref).toBe(`/compare?org=${a}&org=${b}&org=${c}`);
    // Four distinct refs fail closed rather than silently ranking a subset.
    const tooMany = await buildComparePageView(getDemoAuthorizationContext(), {
      org: [a, b, c, d],
    });
    expect(tooMany.state).toBe("malformed");
  });

  it("projects mixed assessment states without declaring a winner", async () => {
    const refs = await refsWithMixedAssessmentStates();
    const view = await buildComparePageView(getDemoAuthorizationContext(), { org: [...refs] });
    expect(view.state).toBe("ready");
    const statuses = view.columns.map((column) => column.assessmentStatusLabel).sort();
    expect(statuses).toContain("Assessed");
    expect(statuses).toContain("Insufficient evidence");
    const serialized = JSON.stringify(view);
    expect(serialized).not.toMatch(/\b(?:top pick|buy now|invest in|recommended organization)\b/i);
    expect(
      view.contrastNotes.some((note) =>
        /no organization is presented as a preferred result/i.test(note),
      ),
    ).toBe(true);
    expect(view.differences.some((row) => row.state === "different" || row.state === "same")).toBe(
      true,
    );
  });

  it("marks insufficient-evidence gaps without treating missing evidence as a missing capability", async () => {
    const refs = await refsWithMixedAssessmentStates();
    const view = await buildComparePageView(getDemoAuthorizationContext(), { org: [...refs] });
    const insufficient = view.columns.find(
      (column) => column.assessmentStatusLabel === "Insufficient evidence",
    );
    expect(insufficient).toBeTruthy();
    expect(insufficient!.gapIndicators.join(" ")).toMatch(
      /not negative fit|insufficient evidence/i,
    );
    expect(
      insufficient!.evidenceByCapability.some((row) =>
        /not a missing capability|Insufficient evidence/i.test(row.gapLabel),
      ),
    ).toBe(true);
  });

  it("emits same and different difference states with fixed labels and stable ordering", async () => {
    const view = await buildComparePageView(getDemoAuthorizationContext(), {
      org: await publicRefs(3),
    });
    expect(view.differences.length).toBeGreaterThan(3);
    const keys = view.differences.map((row) => row.dimensionKey);
    expect(keys).toEqual([...keys].sort((a, b) => a.localeCompare(b, "en")));
    for (const row of view.differences) {
      expect(row.stateLabel).toBe(COMPARE_DIFFERENCE_STATE_LABELS[row.state]);
      expect(["same", "different", "unavailable", "not_comparable"]).toContain(row.state);
      expect(row.cells).toHaveLength(3);
    }
    expect(view.differences.some((row) => row.state === "same" || row.state === "different")).toBe(
      true,
    );
  });

  it("withholds overlay details without revealing existence when overlay:read is denied", async () => {
    const refs = await publicRefs(2);
    const denied = await buildComparePageView(withoutPermission("overlay:read"), { org: refs });
    const allowed = await buildComparePageView(getDemoAuthorizationContext(), { org: refs });
    expect(denied.columns.every((column) => column.overlay.access === "restricted")).toBe(true);
    for (const column of denied.columns) {
      expect(Object.keys(column.overlay)).toEqual(["access"]);
    }
    expect(allowed.columns.some((column) => column.overlay.access !== "restricted")).toBe(true);
    expect(JSON.stringify(denied.columns.map((column) => column.overlay))).not.toMatch(
      /relationshipStatus|capabilityUsage|"notes"/i,
    );
  });

  it("does not leak restricted evidence counts or titles without evidence:restricted_read", async () => {
    const refs = await publicRefs(2);
    const analyst = await buildComparePageView(getDemoAuthorizationContext(), { org: refs });
    const admin = await buildComparePageView(adminContext(), { org: refs });
    const analystCounts = analyst.columns.map((column) =>
      column.evidenceByCapability.reduce((sum, row) => sum + row.publishedEvidenceCount, 0),
    );
    const adminCounts = admin.columns.map((column) =>
      column.evidenceByCapability.reduce((sum, row) => sum + row.publishedEvidenceCount, 0),
    );
    expect(analystCounts.every((count, index) => count <= adminCounts[index]!)).toBe(true);
    expect(JSON.stringify(analyst)).not.toMatch(FORBIDDEN);
    expect(JSON.stringify(admin)).not.toMatch(/Synthetic prospect flagged|private note/i);
    expect(JSON.stringify(admin)).not.toMatch(/"notes":/);
  });

  it("keeps serialized views free of raw IDs and private notes", async () => {
    const view = await buildComparePageView(adminContext(), { org: await publicRefs(3) });
    const serialized = JSON.stringify(view);
    expect(serialized).not.toMatch(FORBIDDEN);
    expect(serialized).not.toMatch(/"organizationId"|"capabilityId"|"evidenceId"|"provenanceId"/);
    expect(view.columns.every((column) => column.evidenceByCapability.length === 5)).toBe(true);
  });

  it("fails closed without organization or assessment read permission", async () => {
    const refs = await publicRefs(2);
    const missingOrg = await buildComparePageView(withoutPermission("organization:read"), {
      org: refs,
    });
    const missingAssessment = await buildComparePageView(withoutPermission("assessment:read"), {
      org: refs,
    });
    expect(missingOrg.state).toBe("unauthorized");
    expect(missingAssessment.state).toBe("unauthorized");
  });

  it("rejects malformed selections and unknown refs", async () => {
    const malformed = await buildComparePageView(getDemoAuthorizationContext(), {
      org: "not-a-ref",
    });
    const unknown = organizationPublicRefFor("org_syn_fi_missing_zzzz");
    const notFound = await buildComparePageView(getDemoAuthorizationContext(), {
      org: [unknown, organizationPublicRefFor("org_syn_fi_missing_yyyy")],
    });
    expect(malformed.state).toBe("malformed");
    expect(notFound.state).toBe("not_found");
  });
});
