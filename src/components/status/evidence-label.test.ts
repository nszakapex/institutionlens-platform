import { describe, expect, it } from "vitest";
import { EVIDENCE_LABELS } from "@/components/status/EvidenceLabel";
import { PRIMARY_NAV } from "@/lib/navigation";

describe("epistemic labels", () => {
  it("defines all six required evidence states with descriptions", () => {
    const kinds = Object.keys(EVIDENCE_LABELS);
    expect(kinds.sort()).toEqual(
      ["calculated", "inference", "missing", "rule-based", "stale", "verified"].sort(),
    );

    for (const meta of Object.values(EVIDENCE_LABELS)) {
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(12);
    }

    expect(EVIDENCE_LABELS.inference.description.toLowerCase()).toMatch(/not.*verified|heuristic/);
    expect(EVIDENCE_LABELS.verified.description.toLowerCase()).toMatch(/synthetic|provenance/);
    expect(EVIDENCE_LABELS.verified.description.toLowerCase()).toMatch(
      /does not mean a real-world|independently verified/,
    );
  });
});

describe("primary navigation", () => {
  it("exposes accessible product destinations without prior-product terminology", () => {
    const labels = PRIMARY_NAV.map((item) => item.label);
    expect(labels).toEqual([
      "Overview",
      "Organizations",
      "Compare",
      "Evidence",
      "Briefs",
      "Methodology",
      "Settings",
    ]);

    const blob = JSON.stringify(PRIMARY_NAV);
    const forbidden = [
      ["AD", "&Co"].join(""),
      ["AD", "Co"].join(""),
      ["Cover", "age"].join(""),
      ["Call", " Report"].join(""),
      ["UB", "PR"].join(""),
    ];
    for (const term of forbidden) {
      expect(blob.toLowerCase()).not.toContain(term.toLowerCase());
    }
    expect(PRIMARY_NAV.filter((item) => item.available).map((item) => item.id)).toEqual([
      "overview",
      "organizations",
      "compare",
      "evidence",
      "briefs",
      "methodology",
    ]);
    expect(PRIMARY_NAV.filter((item) => !item.available).map((item) => item.id)).toEqual([
      "settings",
    ]);
  });
});
