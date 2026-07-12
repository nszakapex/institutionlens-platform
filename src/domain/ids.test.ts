import { describe, expect, it } from "vitest";
import {
  AdapterVersionSchema,
  AssessmentIdSchema,
  CapabilityIdSchema,
  EvidenceIdSchema,
  OrganizationIdSchema,
  PrincipalIdSchema,
  ProvenanceIdSchema,
  TenantIdSchema,
  VerticalIdSchema,
} from "@/domain/ids";

describe("domain identifier schemas", () => {
  it("accepts valid branded identifiers", () => {
    expect(TenantIdSchema.parse("tenant_demo_research")).toBe("tenant_demo_research");
    expect(PrincipalIdSchema.parse("principal_demo_analyst")).toBe("principal_demo_analyst");
    expect(OrganizationIdSchema.parse("org_syn_fi_001")).toBe("org_syn_fi_001");
    expect(EvidenceIdSchema.parse("ev_syn_fi_001_profile")).toBe("ev_syn_fi_001_profile");
    expect(ProvenanceIdSchema.parse("prov_syn_fi_001_profile")).toBe("prov_syn_fi_001_profile");
    expect(CapabilityIdSchema.parse("cap_syn_fi_ops_analytics")).toBe("cap_syn_fi_ops_analytics");
    expect(AssessmentIdSchema.parse("assess_syn_fi_001_fit")).toBe("assess_syn_fi_001_fit");
    expect(VerticalIdSchema.parse("financial_institutions")).toBe("financial_institutions");
    expect(AdapterVersionSchema.parse("1.0.0")).toBe("1.0.0");
  });

  it("rejects missing prefixes, uppercase text, separators, and overlong IDs", () => {
    expect(() => TenantIdSchema.parse("demo_research")).toThrow();
    expect(() => PrincipalIdSchema.parse("principal_Demo")).toThrow();
    expect(() => OrganizationIdSchema.parse("org-syn-fi-001")).toThrow();
    expect(() => EvidenceIdSchema.parse("ev_")).toThrow();
    expect(() => ProvenanceIdSchema.parse(`prov_${"a".repeat(65)}`)).toThrow();
    expect(() => CapabilityIdSchema.parse("cap_syn.fi")).toThrow();
    expect(() => AssessmentIdSchema.parse("assess_syn-fi-001-fit")).toThrow();
  });

  it("rejects invalid vertical IDs and adapter versions", () => {
    expect(() => VerticalIdSchema.parse("FinancialInstitutions")).toThrow();
    expect(() => VerticalIdSchema.parse("_financial_institutions")).toThrow();
    expect(() => VerticalIdSchema.parse("fi-demo")).toThrow();
    expect(() => AdapterVersionSchema.parse("1")).toThrow();
    expect(() => AdapterVersionSchema.parse("1.0")).toThrow();
    expect(() => AdapterVersionSchema.parse("v1.0.0")).toThrow();
  });
});
