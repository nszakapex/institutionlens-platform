import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const FORBIDDEN = [
  /\bAD&Co\b/i,
  /\bADCo\b/i,
  /\bCoverage\b/,
  /\bvendor-exhaust\b/i,
  /\bCall Report\b/i,
  /\bUBPR\b/,
];

/**
 * Paths allowed to mention Coverage / clean-room separation explicitly.
 */
const POLICY_PATHS = new Set([
  path.join("docs", "CLEAN_ROOM_POLICY.md"),
  path.join("docs", "FOUNDATION_PLAN.md"),
  path.join("docs", "DECISIONS.md"),
  path.join("docs", "ARCHITECTURE.md"),
  path.join("README.md"),
  path.join("SECURITY.md"),
  path.join("CONTRIBUTING.md"),
  path.join("scripts", "scan-clean-room.ts"),
]);

const SKIP_DIRS = new Set([".git", ".next", "node_modules", "coverage", "assets", "public"]);

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx|js|mjs|md|css)$/i.test(entry.name)) files.push(full);
  }
  return files;
}

const findings: string[] = [];

for (const file of walk(root)) {
  const relative = path.relative(root, file);
  if (POLICY_PATHS.has(relative)) continue;

  const content = fs.readFileSync(file, "utf8");
  for (const pattern of FORBIDDEN) {
    if (pattern.test(content)) {
      findings.push(`${relative}: matched ${pattern}`);
      pattern.lastIndex = 0;
    }
  }
}

if (findings.length > 0) {
  console.error("Clean-room terminology scan failed:");
  for (const finding of findings) console.error(` - ${finding}`);
  process.exit(1);
}

console.log("Clean-room terminology scan passed.");
