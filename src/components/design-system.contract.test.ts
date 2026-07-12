import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relative: string) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

describe("Phase 2 design-system contracts", () => {
  it("keeps skip link and main landmark wiring", () => {
    const layout = read("src/app/layout.tsx");
    const shell = read("src/components/shell/AppShell.tsx");
    expect(layout).toContain('href="#main"');
    expect(layout).toContain("skip-link");
    expect(shell).toContain('id="main"');
    expect(shell).toContain("tabIndex={-1}");
  });

  it("separates product status metric kinds", () => {
    const metric = read("src/components/status/Metric.tsx");
    for (const kind of ["fit", "confidence", "freshness", "completeness", "publication"]) {
      expect(metric).toContain(`"${kind}"`);
    }
    expect(metric).not.toMatch(/compositeScore|overallScore|opaque/);
  });

  it("marks decorative SVG defaults with aria-hidden", () => {
    const files = [
      "src/components/svg/EvidenceTrace.tsx",
      "src/components/svg/FinancialField.tsx",
      "src/components/svg/FocusReticle.tsx",
      "src/components/svg/InstitutionNetwork.tsx",
    ];
    for (const file of files) {
      expect(read(file)).toMatch(/aria-hidden/);
    }
  });

  it("does not animate the LensMark", () => {
    const mark = read("src/components/svg/LensMark.tsx");
    expect(mark).not.toMatch(/animation|@keyframes|animate/);
  });

  it("ships reduced-motion and focus-visible rules", () => {
    const css = read("src/styles/components.css");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("--il-focus");
  });

  it("avoids external asset URLs in design-system sources", () => {
    const files = [
      "src/styles/tokens.css",
      "src/styles/components.css",
      "src/app/globals.css",
      "src/app/(app)/page.tsx",
    ];
    for (const file of files) {
      const content = read(file);
      expect(content).not.toMatch(/https?:\/\/fonts\.|googleapis|cdn\.|googletagmanager/i);
      expect(content).not.toContain("dangerouslySetInnerHTML");
    }
  });

  it("centralizes brand hex values in tokens", () => {
    const tokens = read("src/styles/tokens.css");
    for (const hex of ["#f5f1e9", "#fbfaf7", "#111310", "#0a52d6", "#64655f", "#111719"]) {
      expect(tokens.toLowerCase()).toContain(hex);
    }
  });
});
