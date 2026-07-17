/**
 * Offline Phase 10 ETL verification entrypoint for npm scripts.
 * Runs Python unit tests, then Vitest ingestion contracts.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const pythonRoot = path.join(root, "python");

function run(command: string, args: string[], cwd: string) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("python", ["-m", "unittest", "discover", "-s", "tests", "-v"], pythonRoot);
run("npx", ["vitest", "run", "src/ingestion/schemas.test.ts"], root);

console.log("Phase 10 ETL verification passed.");
