import { readAndValidatePhase9Schema } from "./phase-9-schema-contract";

const findings = readAndValidatePhase9Schema();

if (findings.length > 0) {
  console.error("Phase 9 schema validation failed:");
  for (const finding of findings) console.error(` - ${finding}`);
  process.exit(1);
}

console.log("Phase 9 schema contract passed: 18 tables, RLS forced, no allow policies.");
