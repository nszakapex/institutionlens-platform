import { describe, expect, it } from "vitest";
import {
  briefDirectoryHref,
  briefDocumentHref,
  parseBriefDirectorySearchParams,
  parseBriefRouteParam,
} from "@/application/brief-query";
import { briefPublicRefFor } from "@/domain/brief-public-ref";
import { organizationPublicRefFor } from "@/domain/organization-public-ref";
import { DEMO_DOMAIN_TENANT_ID } from "@/domain/demo-constants";

const ORG_REF = organizationPublicRefFor("org_syn_fi_001");
const BRIEF_REF = briefPublicRefFor(DEMO_DOMAIN_TENANT_ID, "org_syn_fi_001");

describe("brief query", () => {
  it("parses empty directory selection", () => {
    expect(parseBriefDirectorySearchParams({})).toEqual({
      ok: true,
      query: { orgRef: null },
    });
  });

  it("parses a valid opaque organization preselection", () => {
    const parsed = parseBriefDirectorySearchParams({ org: ORG_REF });
    expect(parsed).toEqual({ ok: true, query: { orgRef: ORG_REF } });
  });

  it("rejects malformed directory tokens fail-closed", () => {
    expect(parseBriefDirectorySearchParams({ org: "org_syn_fi_001" }).ok).toBe(false);
    expect(parseBriefDirectorySearchParams({ org: " " }).ok).toBe(false);
    expect(parseBriefDirectorySearchParams({ org: "bref_" + "a".repeat(20) }).ok).toBe(false);
  });

  it("builds directory and document hrefs from opaque refs", () => {
    expect(briefDirectoryHref()).toBe("/briefs");
    expect(briefDirectoryHref(ORG_REF)).toBe(`/briefs?org=${ORG_REF}`);
    expect(briefDocumentHref(BRIEF_REF)).toBe(`/briefs/${BRIEF_REF}`);
    expect(briefDocumentHref("bad")).toBe("/briefs");
  });

  it("parses brief route params", () => {
    expect(parseBriefRouteParam(BRIEF_REF)).toBe(BRIEF_REF);
    expect(parseBriefRouteParam("org_syn_fi_001")).toBeNull();
  });
});
