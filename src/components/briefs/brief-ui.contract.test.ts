import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { BRIEF_SECTION_ORDER } from "@/application/brief-view-models";
import {
  BRIEF_CLASSIFICATION_LABELS,
  BRIEF_DOCUMENT_STATE_LABELS,
  briefEvidenceAnchorId,
} from "@/lib/brief-labels";

const ROOT = process.cwd();

describe("brief UI Batch 3 contracts", () => {
  it("defines classification and state labels without color-only meaning", () => {
    expect(Object.keys(BRIEF_CLASSIFICATION_LABELS).sort()).toEqual(
      ["assessment", "evidence", "gap", "limitation", "not_published", "unavailable"].sort(),
    );
    expect(BRIEF_DOCUMENT_STATE_LABELS.available).toMatch(/available/i);
    expect(BRIEF_DOCUMENT_STATE_LABELS.insufficient_evidence).toMatch(/insufficient/i);
    expect(BRIEF_DOCUMENT_STATE_LABELS.not_published).toMatch(/not published/i);
  });

  it("builds ID-free evidence anchors from titles", () => {
    expect(briefEvidenceAnchorId("Northbridge Ops Signal")).toBe(
      "brief-evidence-northbridge-ops-signal",
    );
    expect(briefEvidenceAnchorId("!!!")).toBe("brief-evidence-item");
    expect(briefEvidenceAnchorId("Example Title")).not.toMatch(/organizationId|evidenceId/);
  });

  it("keeps document section order aligned to the projection contract", () => {
    expect(BRIEF_SECTION_ORDER).toHaveLength(14);
    const document = readFileSync(
      path.join(ROOT, "src/components/briefs/BriefDocumentPage.tsx"),
      "utf8",
    );
    expect(document).toMatch(/ClassificationBadge/);
    expect(document).toMatch(/BRIEF_CLASSIFICATION_LABELS/);
    expect(document).toMatch(/il-brief-document/);
    expect(document).toMatch(/nonRecommendationDisclaimer/);
    expect(document).toMatch(/PageHeader/);
    expect(document).toMatch(/il-no-print/);
    expect(document).toMatch(/il-print-only/);
    expect(document).not.toMatch(/org_syn_fi_|ev_syn_|prov_syn_|cap_syn_/);
  });

  it("keeps workspace copy distinguishing brief states and eligibility caveats", () => {
    const workspace = readFileSync(
      path.join(ROOT, "src/components/briefs/BriefsWorkspacePage.tsx"),
      "utf8",
    );
    expect(workspace).toMatch(/What an institutional brief contains/);
    expect(workspace).toMatch(/does not guarantee a fully\s+publishable assessment/);
    expect(workspace).toMatch(/BriefSelectionForm/);
    expect(workspace).toMatch(/Available brief/);
    expect(workspace).toMatch(/Insufficient evidence/);
    expect(workspace).toMatch(/Not published/);
    expect(workspace).toMatch(/il-no-print/);
  });

  it("includes print and reduced-motion styles for briefs", () => {
    const css = readFileSync(path.join(ROOT, "src/styles/briefs.css"), "utf8");
    expect(css).toMatch(/@media print/);
    expect(css).toMatch(/\.il-no-print/);
    expect(css).toMatch(/\.il-print-only/);
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/break-inside:\s*avoid/);
    const globals = readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");
    expect(globals).toMatch(/briefs\.css/);
  });

  it("keeps brief routes non-indexable with a single page title pattern", () => {
    for (const relative of [
      "src/app/(app)/briefs/page.tsx",
      "src/app/(app)/briefs/[briefRef]/page.tsx",
    ]) {
      const content = readFileSync(path.join(ROOT, relative), "utf8");
      expect(content).toMatch(/noarchive:\s*true/);
      expect(content).toMatch(/index:\s*false/);
    }
    const document = readFileSync(
      path.join(ROOT, "src/components/briefs/BriefDocumentPage.tsx"),
      "utf8",
    );
    const h1ViaPageHeader = (document.match(/<PageHeader/g) ?? []).length;
    expect(h1ViaPageHeader).toBeGreaterThanOrEqual(1);
    expect(document).not.toMatch(/<h1[\s>]/);
  });
});
