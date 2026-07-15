import { readAndValidatePhase9Schema } from "./phase-9-schema-contract";
import { readAndValidatePhase9LiveVerifier } from "./phase-9-live-verifier-contract";
import { readAndValidatePhase9RlsPolicies } from "./phase-9-rls-policy-contract";

const findings = [
  ...readAndValidatePhase9Schema(),
  ...readAndValidatePhase9LiveVerifier(),
  ...readAndValidatePhase9RlsPolicies(),
];

if (findings.length > 0) {
  console.error("Phase 9 schema validation failed:");
  for (const finding of findings) console.error(` - ${finding}`);
  process.exit(1);
}

console.log(
  "Phase 9 schema contracts passed: 18 tables, RLS forced, corrective default-privilege migration, authenticated read RLS preparation, SELECT-only live verifier.",
);
