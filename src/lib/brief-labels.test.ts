import { describe, expect, it } from "vitest";
import { BRIEF_CLASSIFICATION_LABELS, briefEvidenceAnchorId } from "@/lib/brief-labels";

describe("brief-labels", () => {
  it("exposes six classification labels for non-color status communication", () => {
    expect(BRIEF_CLASSIFICATION_LABELS.evidence).toBe("Observed evidence");
    expect(BRIEF_CLASSIFICATION_LABELS.assessment).toBe("Assessment output");
    expect(BRIEF_CLASSIFICATION_LABELS.gap).toBe("Gap");
  });

  it("slugifies titles without embedding raw identifiers", () => {
    expect(briefEvidenceAnchorId("Example Title")).toBe("brief-evidence-example-title");
    expect(briefEvidenceAnchorId("ev_syn_001 Title")).toBe("brief-evidence-ev-syn-001-title");
  });
});
