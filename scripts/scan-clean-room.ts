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
 * Exact documentation files allowed to mention clean-room boundary terms
 * (Coverage / AD&Co / vendor-exhaust / Call Report / UBPR) when describing the prohibition.
 * No directory wildcards — each path is a single file with a documented reason.
 */
const POLICY_PATHS = new Set([
  // Primary clean-room policy statement
  path.join("docs", "CLEAN_ROOM_POLICY.md"),
  // Product plan that restates the boundary and forbidden transfers
  path.join("docs", "FOUNDATION_PLAN.md"),
  // Binding decisions that reference the clean-room constraint
  path.join("docs", "DECISIONS.md"),
  // Architecture summary that restates no Coverage material
  path.join("docs", "ARCHITECTURE.md"),
  // Phase 3 plan non-goals explicitly exclude Coverage / AD&Co material
  path.join("docs", "PHASE_3_PLAN.md"),
  // Phase 4 plan restates clean-room boundary for assessment methodology
  path.join("docs", "PHASE_4_PLAN.md"),
  // Model governance names the Coverage / AD&Co boundary in one sentence
  path.join("docs", "MODEL_GOVERNANCE.md"),
  // Synthetic data guarantees that restate independent design vs Coverage-derived material
  path.join("docs", "SYNTHETIC_DATA.md"),
  // Top-level contributor/security docs that describe the boundary
  path.join("README.md"),
  path.join("SECURITY.md"),
  path.join("CONTRIBUTING.md"),
  // The scanner itself contains the forbidden patterns as detection rules
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
