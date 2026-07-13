import { buildMethodologyPageView } from "@/application/methodology-service";
import { getDemoAuthorizationContext } from "@/authorization/demo-context";
import { FINANCIAL_INSTITUTION_RULE_SETS } from "@/verticals/financial-institutions/assessment/rules";

async function main(): Promise<void> {
  const view = await buildMethodologyPageView(getDemoAuthorizationContext());
  if (view.state !== "ready") {
    throw new Error("Executable methodology UI view must be available to the demo analyst.");
  }
  if (view.capabilities.length !== 5) {
    throw new Error(
      `Expected five methodology capabilities; received ${view.capabilities.length}.`,
    );
  }

  const executableRules = FINANCIAL_INSTITUTION_RULE_SETS.flatMap((set) => set.rules);
  const uiRules = view.capabilities.flatMap((capability) => capability.rules);
  if (uiRules.length !== executableRules.length || uiRules.length !== 30) {
    throw new Error(
      `Methodology UI drift: executable=${executableRules.length}, UI=${uiRules.length}.`,
    );
  }

  for (const capability of view.capabilities) {
    if (
      capability.rulePointTotal !== capability.declaredMaximumPoints ||
      capability.rulePointTotal !== 100
    ) {
      throw new Error(`${capability.name} must expose an executable 100-point rule set.`);
    }
  }

  for (const executable of executableRules) {
    const rendered = uiRules.find((rule) => rule.title === executable.title);
    if (!rendered || rendered.maximumPoints !== executable.maximumPoints) {
      throw new Error(`Methodology UI rule drift detected for ${executable.title}.`);
    }
  }

  const serialized = JSON.stringify(view);
  if (/\b(?:rule|ruleset|cap|tenant|principal)_[a-z0-9_]+\b/i.test(serialized)) {
    throw new Error("Methodology UI must not serialize raw internal identifiers.");
  }
  if (
    /purchase likelihood|conversion probability|will buy|sales-ready|hot account/i.test(serialized)
  ) {
    throw new Error("Methodology UI contains prohibited predictive language.");
  }

  console.log("Methodology UI validated: 5 capabilities, 30 rules, 100 points per capability.");
}

void main();
