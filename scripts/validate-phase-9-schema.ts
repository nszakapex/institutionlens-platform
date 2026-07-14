import { readAndValidatePhase9Schema } from "./phase-9-schema-contract";
import { readAndValidatePhase9LiveVerifier } from "./phase-9-live-verifier-contract";

const findings = [...readAndValidatePhase9Schema(), ...readAndValidatePhase9LiveVerifier()];

if (findings.length > 0) {
  console.error("Phase 9 schema validation failed:");
  for (const finding of findings) console.error(` - ${finding}`);
  process.exit(1);
}

console.log(
  "Phase 9 schema contracts passed: 18 tables, RLS forced, no allow policies, SELECT-only live verifier.",
);
