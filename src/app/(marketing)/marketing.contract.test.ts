import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MARKETING_ROOT = path.join(ROOT, "src/app/(marketing)");

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (
      (entry.endsWith(".tsx") || entry.endsWith(".ts")) &&
      !entry.endsWith(".test.ts") &&
      !entry.endsWith(".test.tsx")
    ) {
      files.push(full);
    }
  }
  return files;
}

describe("Phase 11 marketing contracts", () => {
  it("exposes required public marketing routes", () => {
    const required = [
      "page.tsx",
      "product/page.tsx",
      "how-it-works/page.tsx",
      "pricing/page.tsx",
      "request-access/page.tsx",
    ];
    for (const relative of required) {
      const content = readFileSync(path.join(MARKETING_ROOT, relative), "utf8");
      expect(content).toMatch(/<h1[\s>]/);
      expect(content).toMatch(/id="main"|id=\{?["']main["']\}?/);
      expect(content).toMatch(/index:\s*true|marketingMetadataBase/);
      expect(content).not.toMatch(/org_syn_fi_|tenant_demo|principal_demo|private_notes/);
      expect(content).not.toMatch(/uuid|source_reference/i);
    }
  });

  it("keeps request-access honest without a fake submit form", () => {
    const content = readFileSync(path.join(MARKETING_ROOT, "request-access/page.tsx"), "utf8");
    expect(content).toMatch(/getFoundingContactUrl/);
    expect(content).toMatch(/No public contact|honest|non-submitting|does not create an account/i);
    expect(content).not.toMatch(/onSubmit|fetch\(|Thank you for submitting|we received your/i);
    expect(content).not.toMatch(/<form[\s>]/);
  });

  it("states founding pricing without invented guarantees", () => {
    const content = readFileSync(path.join(MARKETING_ROOT, "pricing/page.tsx"), "utf8");
    expect(content).toMatch(/\$200/);
    expect(content).toMatch(/\$99/);
    expect(content).toMatch(/one-time setup/i);
    expect(content).toMatch(/per month/i);
    expect(content).not.toMatch(/guarantee|SLA|logo|customers include|ROI/i);
  });

  it("states advice and research boundaries on key pages", () => {
    for (const relative of ["page.tsx", "product/page.tsx", "how-it-works/page.tsx"]) {
      const content = readFileSync(path.join(MARKETING_ROOT, relative), "utf8");
      expect(content).toMatch(/not investment advice/i);
    }
  });

  it("does not embed raw private identifiers across marketing sources", () => {
    for (const file of walk(MARKETING_ROOT)) {
      const content = readFileSync(file, "utf8");
      expect(content).not.toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
      );
      expect(content).not.toMatch(/org_syn_|tenant_demo|principal_demo|private_notes/);
    }
  });

  it("relocates authenticated overview to /app", () => {
    const overview = readFileSync(path.join(ROOT, "src/app/(app)/app/page.tsx"), "utf8");
    expect(overview).toMatch(/OverviewPage|buildOverviewPageView/);
    expect(overview).toMatch(/index:\s*false/);
  });

  it("keeps workspace wordmark and nav pointing at /app", () => {
    const nav = readFileSync(path.join(ROOT, "src/lib/navigation.ts"), "utf8");
    const header = readFileSync(path.join(ROOT, "src/components/shell/ProductHeader.tsx"), "utf8");
    expect(nav).toMatch(/href:\s*"\/app"/);
    expect(header).toMatch(/href="\/app"/);
  });
});
