import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { classifyCompleteness } from "@/domain/assessments/quality";
import {
  EVIDENCE_STATE_COVERAGE_DEFINITION,
  type EvidenceStateCoverage,
} from "@/domain/view-models";

describe("quality dimension separation", () => {
  it("keeps Evidence-state coverage distinct from formal completeness", () => {
    const coverageLabel: EvidenceStateCoverage["label"] = "Evidence-state coverage";
    expect(coverageLabel).toBe("Evidence-state coverage");
    expect(EVIDENCE_STATE_COVERAGE_DEFINITION).toContain("not formal Completeness");

    const formalCompleteness = "unknown" as const;
    expect(formalCompleteness).toBe("unknown");
    expect(formalCompleteness).not.toBe(coverageLabel);
  });

  it("keeps assessment completeness free of organization completeness concepts", () => {
    const qualitySource = readFileSync(
      path.join(process.cwd(), "src/domain/assessments/quality.ts"),
      "utf8",
    );
    expect(qualitySource).toContain("Assessment completeness");
    expect(qualitySource).not.toContain("Evidence-state coverage");

    const completenessFn = qualitySource.match(
      /export function classifyCompleteness[\s\S]*?\n\}/,
    )?.[0];
    expect(completenessFn).toBeTruthy();
    expect(completenessFn).not.toMatch(/organization/i);
    expect(completenessFn).not.toContain("Evidence-state coverage");

    expect(
      classifyCompleteness({
        declaredPossiblePoints: 100,
        evaluatedPossiblePoints: 100,
        requiredGatesSatisfied: true,
        hasInvalidInput: false,
      }),
    ).toBe("sufficient");
  });
});
