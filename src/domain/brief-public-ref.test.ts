import { describe, expect, it } from "vitest";
import {
  BriefPublicRefSchema,
  briefPublicRefFor,
  isBriefPublicRef,
  parseBriefPublicRef,
} from "@/domain/brief-public-ref";
import { DEMO_DOMAIN_TENANT_ID } from "@/domain/demo-constants";
import { buildSyntheticOrganizations } from "@/verticals/financial-institutions/synthetic-organizations";

const TENANT_A = DEMO_DOMAIN_TENANT_ID;
const TENANT_B = "tenant_other_research_workspace";

describe("BriefPublicRef", () => {
  it("generates deterministic refs for a tenant and organization", () => {
    const first = briefPublicRefFor(TENANT_A, "org_syn_fi_001");
    const second = briefPublicRefFor(TENANT_A, "org_syn_fi_001");
    expect(first).toBe(second);
    expect(first).toMatch(/^bref_[a-f0-9]{20}$/);
  });

  it("produces unique refs across all 24 synthetic organizations in one tenant", () => {
    const orgs = buildSyntheticOrganizations();
    const refs = orgs.map((org) => briefPublicRefFor(TENANT_A, org.id));
    expect(new Set(refs).size).toBe(24);
    expect(refs).toHaveLength(24);
  });

  it("does not correlate the same organization id across tenants", () => {
    const orgId = "org_syn_fi_001";
    const a = briefPublicRefFor(TENANT_A, orgId);
    const b = briefPublicRefFor(TENANT_B, orgId);
    expect(a).not.toBe(b);
    expect(a).not.toContain(orgId);
    expect(b).not.toContain(TENANT_A);
    expect(b).not.toContain(TENANT_B);
  });

  it("rejects empty tenant ids", () => {
    expect(() => briefPublicRefFor("", "org_syn_fi_001")).toThrow(/tenant id/i);
  });

  it("validates length bounds and rejects malformed input", () => {
    expect(parseBriefPublicRef("bref_")).toBeNull();
    expect(parseBriefPublicRef("bref_SHORT")).toBeNull();
    expect(parseBriefPublicRef("bref_" + "g".repeat(20))).toBeNull();
    expect(parseBriefPublicRef("org_syn_fi_001")).toBeNull();
    expect(parseBriefPublicRef("oref_abcdef0123456789abcd")).toBeNull();
    expect(isBriefPublicRef(briefPublicRefFor(TENANT_A, "org_syn_fi_002"))).toBe(true);
    expect(() => BriefPublicRefSchema.parse("bad")).toThrow();
  });

  it("does not embed internal organization or tenant ids", () => {
    for (const org of buildSyntheticOrganizations()) {
      const ref = briefPublicRefFor(TENANT_A, org.id);
      expect(ref).not.toContain(org.id);
      expect(ref).not.toContain("org_syn");
      expect(ref).not.toContain("tenant");
    }
  });
});
