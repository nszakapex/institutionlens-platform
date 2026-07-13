import { beforeEach, describe, expect, it } from "vitest";
import { createAuthorizationContext } from "@/authorization/context";
import {
  DEMO_ANALYST,
  DEMO_TENANT,
  getDemoAuthorizationContext,
} from "@/authorization/demo-context";
import { permissionsForRole } from "@/authorization/policy";
import { buildMethodologyPageView } from "@/application/methodology-service";
import { FINANCIAL_INSTITUTION_RULE_SETS } from "@/verticals/financial-institutions/assessment/rules";
import { METHODOLOGY_MANIFEST } from "@/verticals/financial-institutions/assessment/methodology";

function setDemoEnv(): void {
  process.env.IL_APP_MODE = "local-demo";
  process.env.IL_DEMO_TENANT_ID = "demo-tenant-local";
  process.env.IL_DEMO_PRINCIPAL_ID = "demo-principal-local";
}

describe("methodology service", () => {
  beforeEach(() => {
    setDemoEnv();
  });

  it("requires methodology read permission", async () => {
    const context = createAuthorizationContext(
      DEMO_TENANT,
      DEMO_ANALYST,
      permissionsForRole("analyst").filter((item) => item !== "methodology:read"),
    );

    const view = await buildMethodologyPageView(context);
    expect(view.state).toBe("unauthorized");
  });

  it("fails safely for an unsupported methodology version", async () => {
    const view = await buildMethodologyPageView(getDemoAuthorizationContext(), "99.0.0");
    expect(view.state).toBe("unavailable");
    expect(JSON.stringify(view)).not.toMatch(/stack|path|ruleset_|predicate/i);
  });

  it("publishes all five capabilities and all rule titles with totals of 100", async () => {
    const view = await buildMethodologyPageView(getDemoAuthorizationContext());

    expect(view.state).toBe("ready");
    expect(view.capabilities).toHaveLength(5);
    expect(view.manifest.methodologyVersion).toBe(METHODOLOGY_MANIFEST.methodologyVersion);
    expect(view.manifest.engineVersion).toBeTruthy();
    expect(view.manifest.adapterVersion).toBeTruthy();
    expect(view.manifest.domainSchemaVersion).toBeTruthy();

    for (const capability of view.capabilities) {
      expect(capability.rulePointTotal).toBe(100);
      expect(capability.rules.reduce((sum, rule) => sum + rule.maximumPoints, 0)).toBe(100);
      expect(capability.rules.length).toBeGreaterThan(0);
      expect(capability.rules.every((rule) => rule.title.length > 0)).toBe(true);
      expect(capability.rules.every((rule) => !("predicate" in rule))).toBe(true);
    }

    const expectedRuleCount = FINANCIAL_INSTITUTION_RULE_SETS.reduce(
      (sum, ruleSet) => sum + ruleSet.rules.length,
      0,
    );
    const actualRuleCount = view.capabilities.reduce(
      (sum, capability) => sum + capability.rules.length,
      0,
    );
    expect(actualRuleCount).toBe(expectedRuleCount);
  });

  it("includes thresholds, policies, and disclaimers without predictive language or raw IDs", async () => {
    const view = await buildMethodologyPageView(getDemoAuthorizationContext());
    const serialized = JSON.stringify(view);

    expect(view.thresholds.bandThresholds).toHaveLength(4);
    expect(view.policies.opportunityRulesSummary).toMatch(/never alter fit/i);
    expect(view.policies.conditionalScoreBehavior).toMatch(/not negative fit/i);
    expect(view.policies.humanReviewRequirement).toMatch(/human judgment/i);
    expect(view.policies.freshnessPolicy).toEqual(
      expect.arrayContaining([expect.stringMatching(/unknown freshness remains unknown/i)]),
    );
    expect(
      view.capabilities
        .flatMap((capability) => capability.rules)
        .every((rule) => /not evaluated/i.test(rule.missingEvidencePolicy)),
    ).toBe(true);
    expect(view.disclaimers.join(" ")).toMatch(/not deal probabilities/i);
    expect(serialized).not.toMatch(
      /predicate|org_syn_fi_|ev_syn_fi_|prov_syn_fi_|assess_syn_fi_|overlay_syn_fi_|tenant_|principal_|rule_syn_|ruleset_syn_|cap_syn_fi_/,
    );
    expect(serialized).not.toMatch(/will buy|lead score/i);
  });
});
