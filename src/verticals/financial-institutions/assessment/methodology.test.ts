import { describe, expect, it } from "vitest";
import { DEMO_DOMAIN_TENANT_ID } from "@/domain/demo-constants";
import { buildSyntheticOrganizations } from "@/verticals/financial-institutions/synthetic-organizations";
import {
  buildFinancialInstitutionFieldBag,
  FI_ALLOWLISTED_FIELDS,
} from "@/verticals/financial-institutions/assessment/field-bag";
import {
  FINANCIAL_INSTITUTION_RULE_SETS,
  getRuleSet,
} from "@/verticals/financial-institutions/assessment/rules";
import { METHODOLOGY_MANIFEST } from "@/verticals/financial-institutions/assessment/methodology";
import {
  SYNTHETIC_FI_OVERLAYS,
  getOverlayForOrg,
} from "@/verticals/financial-institutions/assessment/synthetic-overlays";
import { SYNTHETIC_FI_PORTFOLIO } from "@/verticals/financial-institutions/assessment/synthetic-portfolio";
import { assertNoPiiPatterns } from "@/domain/overlays/invariants";
import { OrganizationOverlaySchema } from "@/domain/overlays/schemas";
import { CapabilityPortfolioSchema } from "@/domain/portfolios/schemas";
import { deriveOpportunityContext } from "@/assessment/opportunity";

describe("financial-institutions field bag", () => {
  it("emits only allowlisted fields", () => {
    const orgs = buildSyntheticOrganizations();
    expect(orgs.length).toBe(24);

    for (const org of orgs) {
      const bag = buildFinancialInstitutionFieldBag(org);
      const keys = Object.keys(bag.fields);
      expect(keys.sort()).toEqual([...FI_ALLOWLISTED_FIELDS].sort());
      for (const key of keys) {
        expect(FI_ALLOWLISTED_FIELDS.has(key)).toBe(true);
        expect(bag.fieldSources[key]?.evidenceIds).toBeDefined();
      }
    }
  });

  it("maps change signals and region counts deterministically", () => {
    const org = buildSyntheticOrganizations().find((item) => item.id === "org_syn_fi_001");
    expect(org).toBeDefined();
    const bag = buildFinancialInstitutionFieldBag(org!);
    expect(bag.fields.has_public_change_signal).toEqual({ kind: "boolean", value: true });
    expect(bag.fields.latest_public_change_date).toEqual({ kind: "date", value: "2026-02-10" });
    expect(bag.fields.operating_region_count).toEqual({ kind: "integer", value: 1 });
    expect(bag.fields.institution_kind).toEqual({
      kind: "category",
      value: "synthetic_credit_union",
    });
  });
});

describe("financial-institutions rule sets", () => {
  it("parses five rule sets with enabled points summing to 100", () => {
    expect(FINANCIAL_INSTITUTION_RULE_SETS).toHaveLength(5);

    for (const ruleSet of FINANCIAL_INSTITUTION_RULE_SETS) {
      expect(ruleSet.declaredMaximumPoints).toBe(100);
      expect(ruleSet.synthetic).toBe(true);
      expect(ruleSet.version).toBe("1.0.0");
      expect(ruleSet.methodologyVersion).toBe("1.0.0");
      expect(ruleSet.verticalId).toBe("financial_institutions");

      const enabledPoints = ruleSet.rules
        .filter((rule) => rule.enabled)
        .reduce((sum, rule) => sum + rule.maximumPoints, 0);
      expect(enabledPoints).toBe(100);
    }
  });

  it("resolves rule sets by capability and exact version", () => {
    const ruleSet = getRuleSet("cap_syn_fi_ops_analytics", "1.0.0");
    expect(ruleSet.id).toBe("ruleset_syn_fi_ops_analytics");
    expect(() => getRuleSet("cap_syn_fi_ops_analytics", "9.9.9")).toThrow();
  });

  it("matches methodology manifest rule ids and points (drift check)", () => {
    expect(METHODOLOGY_MANIFEST.capabilities).toHaveLength(5);

    for (const capability of METHODOLOGY_MANIFEST.capabilities) {
      const ruleSet = FINANCIAL_INSTITUTION_RULE_SETS.find(
        (item) => item.id === capability.ruleSetId,
      );
      expect(ruleSet, capability.ruleSetId).toBeDefined();
      expect(ruleSet!.capabilityId).toBe(capability.capabilityId);
      expect(ruleSet!.declaredMaximumPoints).toBe(capability.declaredMaximumPoints);
      expect(ruleSet!.version).toBe(capability.version);

      const byId = new Map(ruleSet!.rules.map((rule) => [rule.ruleId, rule]));
      expect(ruleSet!.rules).toHaveLength(capability.rules.length);

      for (const expected of capability.rules) {
        const actual = byId.get(expected.ruleId);
        expect(actual, expected.ruleId).toBeDefined();
        expect(actual!.maximumPoints).toBe(expected.maximumPoints);
        expect(actual!.factorCategory).toBe(expected.factorCategory);
        expect(actual!.enabled).toBe(expected.enabled);
      }
    }
  });

  it("includes at least one allowStale false and one restricted-internal path", () => {
    const allRules = FINANCIAL_INSTITUTION_RULE_SETS.flatMap((ruleSet) => ruleSet.rules);
    expect(allRules.some((rule) => rule.evidenceRequirements.allowStale === false)).toBe(true);
    expect(
      allRules.some((rule) => rule.evidenceRequirements.allowRestrictedInternal === true),
    ).toBe(true);
  });
});

describe("financial-institutions synthetic portfolio", () => {
  it("parses as an active portfolio for the demo tenant", () => {
    const parsed = CapabilityPortfolioSchema.parse(SYNTHETIC_FI_PORTFOLIO);
    expect(parsed.tenantId).toBe(DEMO_DOMAIN_TENANT_ID);
    expect(parsed.status).toBe("active");
    expect(parsed.capabilities).toHaveLength(5);
    expect(parsed.capabilities.map((item) => item.priority)).toEqual([100, 80, 60, 40, 20]);
  });
});

describe("financial-institutions synthetic overlays", () => {
  it("parses overlays, rejects PII patterns, and covers a deliberate subset", () => {
    expect(SYNTHETIC_FI_OVERLAYS.length).toBeGreaterThanOrEqual(8);
    expect(SYNTHETIC_FI_OVERLAYS.length).toBeLessThan(24);

    for (const overlay of SYNTHETIC_FI_OVERLAYS) {
      expect(() => OrganizationOverlaySchema.parse(overlay)).not.toThrow();
      expect(() => assertNoPiiPatterns(overlay)).not.toThrow();
      expect(overlay.sourceClassification).toBe("synthetic_demo");
      expect(overlay.tenantId).toBe(DEMO_DOMAIN_TENANT_ID);
      if (overlay.notes) {
        expect(overlay.notes).not.toMatch(/@/);
        expect(overlay.notes).not.toMatch(/\b\d{7,15}\b/);
      }
    }

    expect(getOverlayForOrg("org_syn_fi_001")?.relationshipStatus).toBe("prospect");
    expect(getOverlayForOrg("org_syn_fi_008")?.relationshipStatus).toBe("excluded");
    expect(getOverlayForOrg("org_syn_fi_003")).toBeUndefined();
  });

  it("derives opportunity contexts without altering fit semantics", () => {
    const prospect = getOverlayForOrg("org_syn_fi_001")!;
    const active = getOverlayForOrg("org_syn_fi_002")!;
    const former = getOverlayForOrg("org_syn_fi_005")!;
    const excluded = getOverlayForOrg("org_syn_fi_008")!;

    expect(deriveOpportunityContext(prospect, "cap_syn_fi_ops_analytics").status).toBe("new_logo");
    expect(deriveOpportunityContext(active, "cap_syn_fi_ops_analytics").status).toBe(
      "existing_use",
    );
    expect(deriveOpportunityContext(active, "cap_syn_fi_data_quality").status).toBe("cross_sell");
    expect(deriveOpportunityContext(former, "cap_syn_fi_governance_review").status).toBe(
      "renewal_or_reengagement",
    );
    expect(deriveOpportunityContext(excluded, "cap_syn_fi_ops_analytics").status).toBe("excluded");
    expect(deriveOpportunityContext(null, "cap_syn_fi_ops_analytics").status).toBe("unknown");
  });
});
