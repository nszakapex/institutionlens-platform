import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const SKIP_DIRS = new Set([".git", ".next", "node_modules", "coverage", "public", "assets"]);

const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "aws-access-key", regex: /AKIA[0-9A-Z]{16}/g },
  {
    name: "generic-api-key-assignment",
    regex: /(api[_-]?key|secret|password)\s*[:=]\s*['\"][^'\"]{12,}/gi,
  },
  { name: "private-key-block", regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g },
  { name: "supabase-service-role", regex: /service_role/gi },
];

const ALLOWED_PATH_FRAGMENTS = [
  path.join("docs"),
  path.join(".env.example"),
  path.join("scripts", "scan-secrets.ts"),
  path.join("scripts", "scan-clean-room.ts"),
  path.join("SECURITY.md"),
  path.join("README.md"),
  path.join("CONTRIBUTING.md"),
];

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (/\.(ts|tsx|js|mjs|cjs|md|json|yml|yaml|css|html|env|example)$/i.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function isAllowed(file: string): boolean {
  const relative = path.relative(root, file);
  return ALLOWED_PATH_FRAGMENTS.some(
    (fragment) => relative === fragment || relative.startsWith(fragment + path.sep),
  );
}

const findings: string[] = [];

for (const file of walk(root)) {
  const relative = path.relative(root, file);
  if (
    relative.endsWith(`${path.sep}.env`) ||
    relative === ".env" ||
    relative.endsWith(".env.local")
  ) {
    findings.push(`Secret-bearing env file should not be committed: ${relative}`);
    continue;
  }

  const content = fs.readFileSync(file, "utf8");
  for (const pattern of SECRET_PATTERNS) {
    if (!pattern.regex.test(content)) {
      pattern.regex.lastIndex = 0;
      continue;
    }
    pattern.regex.lastIndex = 0;
    if (relative.replace(/\\/g, "/").startsWith("scripts/scan-")) continue;
    if (isAllowed(file) && pattern.name === "supabase-service-role") continue;
    findings.push(`${relative}: matched ${pattern.name}`);
  }
}

if (findings.length > 0) {
  console.error("Secret/path scan failed:");
  for (const finding of findings) console.error(` - ${finding}`);
  process.exit(1);
}

console.log("Secret/path scan passed.");
