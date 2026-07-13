import { createHash } from "node:crypto";

/**
 * Fingerprints are integrity / reproducibility aids for deterministic assessment
 * outputs. They are NOT cryptographic signing and do NOT prove authenticity.
 */

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }
  const record = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    const next = canonicalize(record[key]);
    if (next !== undefined) {
      sorted[key] = next;
    }
  }
  return sorted;
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function fingerprintEvidence(evidenceIds: string[]): string {
  const sorted = [...evidenceIds].sort();
  return sha256Hex(canonicalJson(sorted));
}

export function fingerprintAssessmentOutput(payload: unknown): string {
  return sha256Hex(canonicalJson(payload));
}
