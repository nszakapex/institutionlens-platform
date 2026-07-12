import { describe, expect, it } from "vitest";
import { InvariantViolationError } from "@/domain/errors";
import { assertEvidenceInvariants } from "@/domain/invariants";
import { EvidenceRecordSchema, type EvidenceRecord } from "@/domain/schemas/evidence";
import { ProvenanceRecordSchema, type ProvenanceRecord } from "@/domain/schemas/provenance";

const CREATED = "2026-01-15T12:00:00.000Z";
const OBSERVED = "2026-02-01T12:00:00.000Z";

function provenance(overrides: Partial<ProvenanceRecord> = {}): ProvenanceRecord {
  return ProvenanceRecordSchema.parse({
    id: "prov_syn_fi_001_profile",
    tenantId: "tenant_demo_research",
    sourceType: "synthetic_fixture",
    sourceName: "Synthetic profile fixture",
    sourceReference: "synthetic://financial-institutions/org_syn_fi_001/profile",
    retrievedAt: OBSERVED,
    publishedAt: OBSERVED,
    reportingPeriod: null,
    checksum: "a".repeat(64),
    licenseStatus: "synthetic_demo",
    accessClassification: "synthetic",
    validationStatus: "validated",
    synthetic: true,
    dataClassification: "synthetic",
    createdAt: CREATED,
    domainSchemaVersion: "1.0.0",
    ...overrides,
  });
}

function evidence(overrides: Partial<EvidenceRecord> = {}): EvidenceRecord {
  return EvidenceRecordSchema.parse({
    id: "ev_syn_fi_001_profile",
    tenantId: "tenant_demo_research",
    organizationId: "org_syn_fi_001",
    verticalId: "financial_institutions",
    adapterVersion: "1.0.0",
    evidenceType: "organization_profile",
    epistemicStatus: "verified",
    title: "Verified synthetic profile",
    summary: "Synthetic evidence for invariant tests.",
    observation: { kind: "category", value: "synthetic_bank" },
    observedAt: OBSERVED,
    effectivePeriod: null,
    freshness: "current",
    confidence: "high",
    provenanceId: "prov_syn_fi_001_profile",
    publicationEligibility: "internal_only",
    synthetic: true,
    dataClassification: "synthetic",
    createdAt: CREATED,
    updatedAt: CREATED,
    domainSchemaVersion: "1.0.0",
    ...overrides,
  });
}

describe("assertEvidenceInvariants", () => {
  it("requires verified evidence to include eligible provenance", () => {
    expect(() => assertEvidenceInvariants(evidence({ provenanceId: null }), null)).toThrow(
      InvariantViolationError,
    );

    expect(() =>
      assertEvidenceInvariants(evidence(), provenance({ validationStatus: "unvalidated" })),
    ).toThrow(InvariantViolationError);
  });

  it("prevents missing evidence from carrying an observation value", () => {
    expect(() =>
      assertEvidenceInvariants(
        evidence({
          epistemicStatus: "missing",
          observation: { kind: "text", value: "not actually missing" },
          observedAt: null,
          provenanceId: null,
          publicationEligibility: "restricted",
          freshness: "unknown",
          confidence: "unknown",
        }),
        null,
      ),
    ).toThrow(InvariantViolationError);
  });

  it("does not allow inference evidence to be publication eligible", () => {
    expect(() =>
      assertEvidenceInvariants(
        evidence({
          epistemicStatus: "inference",
          provenanceId: null,
          publicationEligibility: "eligible",
          confidence: "low",
        }),
        null,
      ),
    ).toThrow(InvariantViolationError);
  });

  it("requires calculated evidence to include calculation inputs or a descriptor", () => {
    expect(() =>
      assertEvidenceInvariants(
        evidence({
          epistemicStatus: "calculated",
          provenanceId: null,
          publicationEligibility: "internal_only",
        }),
        null,
      ),
    ).toThrow(InvariantViolationError);

    expect(() =>
      assertEvidenceInvariants(
        evidence({
          epistemicStatus: "calculated",
          provenanceId: null,
          publicationEligibility: "internal_only",
          calculationDescriptor: "synthetic_calculation_v1",
        }),
        null,
      ),
    ).not.toThrow();
  });

  it("requires stale evidence to preserve the original observation and reason", () => {
    expect(() =>
      assertEvidenceInvariants(
        evidence({
          epistemicStatus: "stale",
          observation: null,
          freshness: "stale",
          publicationEligibility: "review_required",
          stalenessReason: "Observation aged out.",
        }),
        provenance(),
      ),
    ).toThrow(InvariantViolationError);

    expect(() =>
      assertEvidenceInvariants(
        evidence({
          epistemicStatus: "stale",
          freshness: "stale",
          publicationEligibility: "review_required",
          stalenessReason: "Observation aged out.",
        }),
        provenance(),
      ),
    ).not.toThrow();
  });

  it("does not allow unknown-license provenance to be publication eligible", () => {
    expect(() =>
      assertEvidenceInvariants(
        evidence({
          epistemicStatus: "rule_based",
          evidenceType: "data_availability",
          publicationEligibility: "eligible",
          ruleSetRef: "ruleset_syn_fi_availability@deferred",
          dataClassification: "restricted",
        }),
        provenance({
          licenseStatus: "unknown",
          accessClassification: "restricted",
        }),
      ),
    ).toThrow(InvariantViolationError);
  });
});
