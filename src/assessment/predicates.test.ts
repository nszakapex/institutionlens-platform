import { describe, expect, it } from "vitest";
import { RuleEvaluationError } from "@/domain/errors";
import { evaluatePredicate } from "@/assessment/predicates";
import type { EvaluationContext } from "@/assessment/context";
import type { EvidenceRecord } from "@/domain/schemas/evidence";
import type { ProvenanceRecord } from "@/domain/schemas/provenance";
import type { Predicate } from "@/domain/assessments/predicates";

const ASSESSED_AT = "2026-04-01T12:00:00.000Z";

function provenance(overrides: Partial<ProvenanceRecord> = {}): ProvenanceRecord {
  return {
    id: "prov_syn_test_001",
    tenantId: "tenant_demo_research",
    sourceType: "synthetic_fixture",
    sourceName: "Synthetic fixture",
    sourceReference: "synthetic://test/profile",
    retrievedAt: ASSESSED_AT,
    publishedAt: ASSESSED_AT,
    reportingPeriod: null,
    checksum: "a".repeat(64),
    licenseStatus: "synthetic_demo",
    accessClassification: "synthetic",
    validationStatus: "validated",
    synthetic: true,
    dataClassification: "synthetic",
    createdAt: ASSESSED_AT,
    domainSchemaVersion: "1.0.0",
    ...overrides,
  };
}

function evidence(overrides: Partial<EvidenceRecord> = {}): EvidenceRecord {
  return {
    id: "ev_syn_test_001",
    tenantId: "tenant_demo_research",
    organizationId: "org_syn_test_001",
    verticalId: "test_vertical",
    adapterVersion: "1.0.0",
    evidenceType: "organization_profile",
    epistemicStatus: "verified",
    title: "Synthetic evidence",
    summary: "Synthetic evidence for predicate tests.",
    observation: { kind: "category", value: "bank" },
    observedAt: ASSESSED_AT,
    effectivePeriod: null,
    freshness: "current",
    confidence: "high",
    provenanceId: "prov_syn_test_001",
    publicationEligibility: "internal_only",
    synthetic: true,
    dataClassification: "synthetic",
    createdAt: ASSESSED_AT,
    updatedAt: ASSESSED_AT,
    domainSchemaVersion: "1.0.0",
    ...overrides,
  };
}

function ctx(overrides: Partial<EvaluationContext> = {}): EvaluationContext {
  const prov = provenance();
  return {
    organizationId: "org_syn_test_001",
    tenantId: "tenant_demo_research",
    assessedAt: ASSESSED_AT,
    evidence: [evidence()],
    provenanceById: new Map([[prov.id, prov]]),
    fields: {
      institution_kind: { kind: "category", value: "bank" },
      region_codes: { kind: "category_list", values: ["west", "midwest"] },
      employee_count: { kind: "integer", value: 120 },
      capital_ratio: { kind: "decimal", value: "12.50000000" },
      is_mutual: { kind: "boolean", value: true },
      last_change_date: { kind: "date", value: "2026-03-20" },
    },
    fieldSources: {
      institution_kind: { evidenceIds: ["ev_syn_test_001"] },
      region_codes: { evidenceIds: ["ev_syn_test_001"] },
      employee_count: { evidenceIds: ["ev_syn_test_001"] },
      capital_ratio: { evidenceIds: ["ev_syn_test_001"] },
      is_mutual: { evidenceIds: ["ev_syn_test_001"] },
      last_change_date: { evidenceIds: ["ev_syn_test_001"] },
    },
    allowlistedFields: new Set([
      "institution_kind",
      "region_codes",
      "employee_count",
      "capital_ratio",
      "is_mutual",
      "last_change_date",
    ]),
    ...overrides,
  };
}

describe("evaluatePredicate", () => {
  it("rejects non-allowlisted field tokens", () => {
    expect(() =>
      evaluatePredicate({ type: "category_equals", field: "secret_path", value: "x" }, ctx()),
    ).toThrow(RuleEvaluationError);
  });

  it("evaluates evidence_exists with types and minCount", () => {
    const context = ctx({
      evidence: [
        evidence({ id: "ev_syn_test_001", evidenceType: "organization_profile" }),
        evidence({
          id: "ev_syn_test_002",
          evidenceType: "capability_signal",
          epistemicStatus: "missing",
          observation: null,
          observedAt: null,
          provenanceId: null,
          freshness: "unknown",
          confidence: "unknown",
          publicationEligibility: "restricted",
        }),
        evidence({ id: "ev_syn_test_003", evidenceType: "capability_signal" }),
      ],
    });

    const ok = evaluatePredicate(
      {
        type: "evidence_exists",
        evidenceTypes: ["capability_signal"],
        minCount: 1,
      },
      context,
    );
    expect(ok.ok).toBe(true);
    expect(ok.usedEvidenceIds).toEqual(["ev_syn_test_003"]);

    const tooFew = evaluatePredicate(
      {
        type: "evidence_exists",
        evidenceTypes: ["capability_signal"],
        minCount: 2,
      },
      context,
    );
    expect(tooFew.ok).toBe(false);
  });

  it("evaluates category_equals and category_in", () => {
    expect(
      evaluatePredicate(
        { type: "category_equals", field: "institution_kind", value: "bank" },
        ctx(),
      ).ok,
    ).toBe(true);
    expect(
      evaluatePredicate(
        { type: "category_equals", field: "institution_kind", value: "credit_union" },
        ctx(),
      ).ok,
    ).toBe(false);
    expect(
      evaluatePredicate(
        { type: "category_in", field: "institution_kind", values: ["bank", "thrift"] },
        ctx(),
      ).ok,
    ).toBe(true);
  });

  it("evaluates category_list_contains", () => {
    expect(
      evaluatePredicate(
        { type: "category_list_contains", field: "region_codes", value: "west" },
        ctx(),
      ).ok,
    ).toBe(true);
    expect(
      evaluatePredicate(
        { type: "category_list_contains", field: "region_codes", value: "northeast" },
        ctx(),
      ).ok,
    ).toBe(false);
  });

  it("evaluates integer_between and decimal_between without float compare", () => {
    expect(
      evaluatePredicate(
        { type: "integer_between", field: "employee_count", min: 100, max: 200 },
        ctx(),
      ).ok,
    ).toBe(true);
    expect(
      evaluatePredicate({ type: "integer_between", field: "employee_count", min: 200 }, ctx()).ok,
    ).toBe(false);
    expect(
      evaluatePredicate(
        { type: "decimal_between", field: "capital_ratio", min: "12.49999999", max: "12.50000001" },
        ctx(),
      ).ok,
    ).toBe(true);
    expect(
      evaluatePredicate(
        { type: "decimal_between", field: "capital_ratio", min: "12.50000001" },
        ctx(),
      ).ok,
    ).toBe(false);
  });

  it("evaluates boolean_equals and date_within_period", () => {
    expect(
      evaluatePredicate({ type: "boolean_equals", field: "is_mutual", value: true }, ctx()).ok,
    ).toBe(true);
    expect(
      evaluatePredicate(
        { type: "date_within_period", field: "last_change_date", withinDays: 30 },
        ctx(),
      ).ok,
    ).toBe(true);
    expect(
      evaluatePredicate(
        { type: "date_within_period", field: "last_change_date", withinDays: 5 },
        ctx(),
      ).ok,
    ).toBe(false);
  });

  it("evaluates freshness_is", () => {
    const result = evaluatePredicate(
      {
        type: "freshness_is",
        evidenceTypes: ["organization_profile"],
        statuses: ["current"],
      },
      ctx(),
    );
    expect(result.ok).toBe(true);
    expect(result.usedEvidenceIds).toEqual(["ev_syn_test_001"]);
  });

  it("reports missingField for absent observations", () => {
    const result = evaluatePredicate(
      { type: "category_equals", field: "institution_kind", value: "bank" },
      ctx({ fields: { institution_kind: null } }),
    );
    expect(result.ok).toBe(false);
    expect(result.missingField).toBe(true);
  });

  it("evaluates nested all/any predicates", () => {
    const predicate: Predicate = {
      type: "all",
      predicates: [
        { type: "category_equals", field: "institution_kind", value: "bank" },
        {
          type: "any",
          predicates: [
            { type: "boolean_equals", field: "is_mutual", value: false },
            { type: "integer_between", field: "employee_count", min: 100 },
          ],
        },
      ],
    };
    expect(evaluatePredicate(predicate, ctx()).ok).toBe(true);
  });
});
