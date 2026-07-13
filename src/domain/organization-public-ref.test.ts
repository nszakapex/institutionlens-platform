import { describe, expect, it } from "vitest";
import {
  OrganizationPublicRefSchema,
  isOrganizationPublicRef,
  organizationPublicRefFor,
  parseOrganizationPublicRef,
} from "@/domain/organization-public-ref";
import { buildSyntheticOrganizations } from "@/verticals/financial-institutions/synthetic-organizations";

describe("OrganizationPublicRef", () => {
  it("generates deterministic refs for synthetic organizations", () => {
    const first = organizationPublicRefFor("org_syn_fi_001");
    const second = organizationPublicRefFor("org_syn_fi_001");
    expect(first).toBe(second);
    expect(first).toMatch(/^oref_[a-f0-9]{20}$/);
  });

  it("produces unique refs across all 24 synthetic organizations", () => {
    const orgs = buildSyntheticOrganizations();
    const refs = orgs.map((org) => organizationPublicRefFor(org.id));
    expect(new Set(refs).size).toBe(24);
    expect(refs).toHaveLength(24);
  });

  it("validates length bounds and rejects malformed input", () => {
    expect(parseOrganizationPublicRef("oref_")).toBeNull();
    expect(parseOrganizationPublicRef("oref_SHORT")).toBeNull();
    expect(parseOrganizationPublicRef("oref_" + "g".repeat(20))).toBeNull();
    expect(parseOrganizationPublicRef("org_syn_fi_001")).toBeNull();
    expect(parseOrganizationPublicRef("tenant_demo_research")).toBeNull();
    expect(isOrganizationPublicRef(organizationPublicRefFor("org_syn_fi_002"))).toBe(true);
    expect(() => OrganizationPublicRefSchema.parse("bad")).toThrow();
  });

  it("is not derived from tenant id or display name", () => {
    const ref = organizationPublicRefFor("org_syn_fi_003");
    expect(ref).not.toContain("tenant");
    expect(ref).not.toContain("demo");
    expect(ref.toLowerCase()).not.toContain("syn_fi_003".replace(/_/g, ""));
  });

  it("does not embed internal organization ids", () => {
    for (const org of buildSyntheticOrganizations()) {
      const ref = organizationPublicRefFor(org.id);
      expect(ref).not.toContain(org.id);
      expect(ref).not.toContain("org_syn");
    }
  });
});
