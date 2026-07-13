import { describe, expect, it } from "vitest";
import {
  canonicalJson,
  fingerprintAssessmentOutput,
  fingerprintEvidence,
  sha256Hex,
} from "@/assessment/fingerprint";

describe("fingerprint", () => {
  it("produces key-order-independent canonical JSON", () => {
    const left = canonicalJson({ b: 2, a: { d: 4, c: 3 }, list: [1, 2] });
    const right = canonicalJson({ list: [1, 2], a: { c: 3, d: 4 }, b: 2 });
    expect(left).toBe(right);
    expect(left).toBe('{"a":{"c":3,"d":4},"b":2,"list":[1,2]}');
  });

  it("preserves array order and omits undefined object values", () => {
    expect(canonicalJson({ a: 1, b: undefined, c: null })).toBe('{"a":1,"c":null}');
    expect(canonicalJson([3, 1, 2])).toBe("[3,1,2]");
  });

  it("hashes with sha256Hex", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("fingerprints evidence ids after sorting", () => {
    expect(fingerprintEvidence(["ev_b", "ev_a"])).toBe(fingerprintEvidence(["ev_a", "ev_b"]));
  });

  it("fingerprints assessment payloads stably", () => {
    const left = fingerprintAssessmentOutput({ score: 10, band: "limited_observed_alignment" });
    const right = fingerprintAssessmentOutput({ band: "limited_observed_alignment", score: 10 });
    expect(left).toBe(right);
  });
});
