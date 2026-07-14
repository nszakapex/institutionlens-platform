import { describe, expect, it } from "vitest";
import { createAuthorizationContext } from "@/authorization/context";
import {
  DEMO_ANALYST,
  DEMO_TENANT,
  getDemoAuthorizationContext,
} from "@/authorization/demo-context";
import { permissionsForRole } from "@/authorization/policy";
import { inboundBriefActionFor } from "@/application/inbound-brief-action";
import { briefPublicRefFor } from "@/domain/brief-public-ref";
import { DEMO_DOMAIN_TENANT_ID } from "@/domain/demo-constants";

describe("inboundBriefActionFor", () => {
  it("builds a tenant-scoped opaque bref_ href with an organization-specific accessible name", () => {
    const action = inboundBriefActionFor(getDemoAuthorizationContext(), {
      organizationId: "org_syn_fi_001",
      displayName: "Ashcroft Illustrative Credit Union",
    });
    expect(action).not.toBeNull();
    const expected = briefPublicRefFor(DEMO_DOMAIN_TENANT_ID, "org_syn_fi_001");
    expect(action!.briefHref).toBe(`/briefs/${expected}`);
    expect(action!.briefHref).toMatch(/^\/briefs\/bref_[a-f0-9]{16,32}$/);
    expect(action!.briefActionLabel).toBe(
      "Open institutional brief for Ashcroft Illustrative Credit Union",
    );
    expect(JSON.stringify(action)).not.toMatch(/org_syn_fi_/);
    expect(action!.briefActionLabel).not.toMatch(/available|insufficient|not published/i);
  });

  it("omits the action when brief:read is missing", () => {
    const context = createAuthorizationContext(
      DEMO_TENANT,
      DEMO_ANALYST,
      permissionsForRole("analyst").filter((item) => item !== "brief:read"),
    );
    expect(
      inboundBriefActionFor(context, {
        organizationId: "org_syn_fi_001",
        displayName: "Ashcroft Illustrative Credit Union",
      }),
    ).toBeNull();
  });

  it("omits the action when organization:read is missing", () => {
    const context = createAuthorizationContext(
      DEMO_TENANT,
      DEMO_ANALYST,
      permissionsForRole("analyst").filter((item) => item !== "organization:read"),
    );
    expect(
      inboundBriefActionFor(context, {
        organizationId: "org_syn_fi_001",
        displayName: "Ashcroft Illustrative Credit Union",
      }),
    ).toBeNull();
  });

  it("scopes bref_ by tenant so the same organization id cannot correlate across tenants", () => {
    const refA = briefPublicRefFor(DEMO_DOMAIN_TENANT_ID, "org_syn_fi_001");
    const refB = briefPublicRefFor("tenant_other_research_workspace", "org_syn_fi_001");
    expect(refA).not.toBe(refB);
    const action = inboundBriefActionFor(getDemoAuthorizationContext(), {
      organizationId: "org_syn_fi_001",
      displayName: "A",
    });
    expect(action!.briefHref).toBe(`/briefs/${refA}`);
    expect(action!.briefHref).not.toContain(refB);
  });
});
