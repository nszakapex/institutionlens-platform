/**
 * Offline methodology drift validation for synthetic FI rule sets.
 * Run via: tsx --require ./test/shims/preload-server-only.cjs scripts/validate-methodology.ts
 */
import { FINANCIAL_INSTITUTION_RULE_SETS } from "@/verticals/financial-institutions/assessment/rules";
import { METHODOLOGY_MANIFEST } from "@/verticals/financial-institutions/assessment/methodology";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function main(): void {
  assert(FINANCIAL_INSTITUTION_RULE_SETS.length === 5, "Expected five rule sets.");
  assert(
    METHODOLOGY_MANIFEST.capabilities.length === 5,
    "Expected five methodology capability entries.",
  );

  for (const capability of METHODOLOGY_MANIFEST.capabilities) {
    const ruleSet = FINANCIAL_INSTITUTION_RULE_SETS.find(
      (item) => item.id === capability.ruleSetId,
    );
    assert(ruleSet, `Missing rule set ${capability.ruleSetId}`);
    assert(ruleSet.declaredMaximumPoints === 100, `${ruleSet.id} declared maximum must be 100`);

    const enabledPoints = ruleSet.rules
      .filter((rule) => rule.enabled)
      .reduce((sum, rule) => sum + rule.maximumPoints, 0);
    assert(enabledPoints === 100, `${ruleSet.id} enabled points must sum to 100`);

    const byId = new Map(ruleSet.rules.map((rule) => [rule.ruleId, rule]));
    for (const expected of capability.rules) {
      const actual = byId.get(expected.ruleId);
      assert(actual, `Missing rule ${expected.ruleId}`);
      assert(actual.maximumPoints === expected.maximumPoints, `Point drift on ${expected.ruleId}`);
      assert(
        actual.factorCategory === expected.factorCategory,
        `Factor category drift on ${expected.ruleId}`,
      );
    }
  }

  console.log("Methodology validation passed.");
}

try {
  main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Methodology validation failed: ${message}`);
  process.exitCode = 1;
}
