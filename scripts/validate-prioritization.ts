/**
 * Validates Phase 5 prioritization / attention policy manifests for drift.
 */
import {
  ATTENTION_POLICY_MANIFEST,
  ATTENTION_POLICY_VERSION,
  ATTENTION_REASON_CODES,
} from "@/application/attention-policy";
import {
  PRIORITIZATION_POLICY_MANIFEST,
  PRIORITIZATION_POLICY_VERSION,
} from "@/application/prioritization-policy";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function main() {
  assert(PRIORITIZATION_POLICY_VERSION === "1.0.0", "prioritization version drift");
  assert(PRIORITIZATION_POLICY_MANIFEST.shortlistMaxRows === 8, "shortlist max drift");
  assert(ATTENTION_POLICY_MANIFEST.maxRows === 10, "attention max drift");
  assert(ATTENTION_POLICY_VERSION === "1.0.0", "attention version drift");
  assert(
    ATTENTION_POLICY_MANIFEST.reasonCodes.length === ATTENTION_REASON_CODES.length,
    "attention reason count drift",
  );
  assert(
    !JSON.stringify(PRIORITIZATION_POLICY_MANIFEST).includes("pointsPossible"),
    "prioritization must not encode score thresholds",
  );
  console.log("validate:prioritization ok");
}

main();
