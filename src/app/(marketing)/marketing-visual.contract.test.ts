import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(relative: string) {
  return readFileSync(path.join(ROOT, relative), "utf8");
}

const NEW_MOTIFS = [
  "src/components/svg/EvidenceLens.tsx",
  "src/components/svg/ProvenancePath.tsx",
  "src/components/svg/SignalField.tsx",
  "src/components/svg/RelationshipPaths.tsx",
];

const PAGE_SOURCES = [
  "src/app/(marketing)/page.tsx",
  "src/app/(marketing)/product/page.tsx",
  "src/app/(marketing)/how-it-works/page.tsx",
  "src/app/(marketing)/pricing/page.tsx",
  "src/app/(marketing)/request-access/page.tsx",
  "src/app/login/page.tsx",
];

describe("Phase 11.1 visual-system contracts", () => {
  it("keeps new SVG motifs decorative by default with no external references", () => {
    for (const file of NEW_MOTIFS) {
      const content = read(file);
      expect(content).toMatch(/decorative = true/);
      expect(content).toMatch(/aria-hidden/);
      expect(content).not.toMatch(/https?:\/\//);
      expect(content).not.toMatch(/<image|\.png|\.jpe?g|\.webp|base64/i);
      // Non-decorative variants must self-describe as illustrative geometry.
      expect(content).toMatch(/[Ii]llustrative/);
    }
  });

  it("keeps marketing styles self-contained (no external assets or imports)", () => {
    const css = read("src/styles/marketing.css");
    expect(css).not.toMatch(/https?:\/\//);
    expect(css).not.toMatch(/@import/);
    expect(css).toMatch(/prefers-reduced-motion/);
  });

  it("defines the Phase 11.1 depth tokens", () => {
    const tokens = read("src/styles/tokens.css");
    for (const token of [
      "--il-fs-display-hero",
      "--il-surface-sunken",
      "--il-shadow-ambient",
      "--il-shadow-lift",
      "--il-edge-light",
      "--il-grad-panel",
      "--il-grad-band-night",
    ]) {
      expect(tokens).toContain(token);
    }
  });

  it("renders exactly one H1 per public page source", () => {
    for (const file of PAGE_SOURCES) {
      const content = read(file);
      const matches = content.match(/<h1[\s>]/g) ?? [];
      expect(matches, `${file} must contain exactly one <h1>`).toHaveLength(1);
    }
  });

  it("keeps the login portal noindex with guarded return path and no page-level form", () => {
    const login = read("src/app/login/page.tsx");
    expect(login).toMatch(/index:\s*false/);
    expect(login).toMatch(/safeReturnPath/);
    expect(login).toMatch(/LoginForm/);
    expect(login).not.toMatch(/<form[\s>]/);
  });

  it("keeps the workspace stylesheets untouched by the marketing redesign", () => {
    // Marketing composition classes must not leak into workspace styles.
    for (const file of [
      "src/styles/overview-explorer.css",
      "src/styles/detail-evidence-methodology.css",
      "src/styles/briefs.css",
    ]) {
      const content = read(file);
      expect(content).not.toMatch(/il-band|il-hero-panel|il-login-scene|il-price-panel/);
    }
  });
});
