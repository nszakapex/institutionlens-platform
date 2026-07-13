import { describe, expect, it } from "vitest";
import { evaluateCapabilityAssessment } from "@/assessment/engine";
import type { EvaluationContext } from "@/assessment/context";
import type { AssessmentRule, RuleSet } from "@/domain/assessments/rules";
import type { EvidenceRecord } from "@/domain/schemas/evidence";
import type { ProvenanceRecord } from "@/domain/schemas/provenance";
import type { Predicate } from "@/domain/assessments/predicates";

const ASSESSED_AT = "2026-04-01T12:00:00.000Z";
const TENANT = "tenant_demo_research" as const;
const ORG = "org_syn_test_001" as const;
const PORTFOLIO = "portfolio_syn_test_demo" as const;
const CAP = "cap_syn_test_ops" as const;
const RULESET = "ruleset_syn_test_ops" as const;

function provenance(overrides: Partial<ProvenanceRecord> = {}): ProvenanceRecord {
  return {
    id: "prov_syn_test_001",
    tenantId: TENANT,
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
    tenantId: TENANT,
    organizationId: ORG,
    verticalId: "test_vertical",
    adapterVersion: "1.0.0",
    evidenceType: "organization_profile",
    epistemicStatus: "verified",
    title: "Synthetic evidence",
    summary: "Synthetic evidence for engine tests.",
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

function baseRule(
  overrides: Partial<AssessmentRule> & { ruleId: AssessmentRule["ruleId"] },
): AssessmentRule {
  return {
    ruleSetId: RULESET,
    ruleSetVersion: "1.0.0",
    verticalId: "test_vertical",
    capabilityId: CAP,
    factorCategory: "organizational_profile_fit",
    title: "Synthetic rule",
    rationale: "Synthetic rationale for tests.",
    maximumPoints: 100,
    evidenceRequirements: {
      requiredEvidenceTypes: ["organization_profile"],
      requireValidatedProvenance: true,
      allowStale: false,
      allowRestrictedInternal: false,
      allowInference: false,
    },
    predicate: { type: "category_equals", field: "institution_kind", value: "bank" },
    missingEvidenceBehavior: "not_evaluated_missing",
    staleEvidenceBehavior: "not_evaluated_stale",
    restrictedEvidenceBehavior: "not_evaluated_restricted",
    publicationPolicy: { impact: "derived_from_evidence" },
    enabled: true,
    methodologyNotes: "Synthetic methodology note.",
    synthetic: true,
    ...overrides,
  };
}

function ruleSet(overrides: Partial<RuleSet> = {}): RuleSet {
  const rules = overrides.rules ?? [baseRule({ ruleId: "rule_syn_test_profile" })];
  const declaredMaximumPoints =
    overrides.declaredMaximumPoints ??
    rules.filter((rule) => rule.enabled).reduce((sum, rule) => sum + rule.maximumPoints, 0);
  const rest = { ...overrides };
  delete rest.rules;
  delete rest.declaredMaximumPoints;
  return {
    id: RULESET,
    version: "1.0.0",
    verticalId: "test_vertical",
    capabilityId: CAP,
    requiredGates: [],
    enabled: true,
    synthetic: true,
    methodologyVersion: "1.0.0",
    ...rest,
    rules,
    declaredMaximumPoints,
  };
}

function context(overrides: Partial<EvaluationContext> = {}): EvaluationContext {
  const prov = provenance();
  return {
    organizationId: ORG,
    tenantId: TENANT,
    assessedAt: ASSESSED_AT,
    evidence: [evidence()],
    provenanceById: new Map([[prov.id, prov]]),
    fields: {
      institution_kind: { kind: "category", value: "bank" },
    },
    fieldSources: {
      institution_kind: { evidenceIds: ["ev_syn_test_001"] },
    },
    allowlistedFields: new Set(["institution_kind"]),
    ...overrides,
  };
}

function evaluate(partial: {
  ruleSet?: RuleSet;
  context?: EvaluationContext;
  assessmentId?: `assess_${string}`;
}) {
  return evaluateCapabilityAssessment({
    assessmentId: partial.assessmentId ?? "assess_syn_test_fit_001",
    tenantId: TENANT,
    organizationId: ORG,
    portfolioId: PORTFOLIO,
    ruleSet: partial.ruleSet ?? ruleSet(),
    context: partial.context ?? context(),
  });
}

describe("evaluateCapabilityAssessment", () => {
  it("awards points when the predicate matches", () => {
    const result = evaluate({});
    expect(result.fit).toEqual({
      status: "assessed",
      pointsAwarded: 100,
      pointsPossible: 100,
      band: "strong_observed_alignment",
    });
    expect(result.ledger[0]?.outcome).toBe("awarded");
    expect(result.publicationEligibility).toBe("internal_only");
  });

  it("marks not_awarded when the predicate fails", () => {
    const result = evaluate({
      context: context({
        fields: { institution_kind: { kind: "category", value: "credit_union" } },
      }),
    });
    expect(result.fit.status).toBe("assessed");
    if (result.fit.status === "assessed") {
      expect(result.fit.pointsAwarded).toBe(0);
      expect(result.fit.band).toBe("limited_observed_alignment");
    }
    expect(result.ledger[0]?.outcome).toBe("not_awarded");
  });

  it("returns not_evaluated_missing when required evidence type is absent", () => {
    const result = evaluate({
      context: context({
        evidence: [
          evidence({
            id: "ev_syn_test_002",
            evidenceType: "capability_signal",
          }),
        ],
      }),
    });
    expect(result.ledger[0]?.outcome).toBe("not_evaluated_missing");
    expect(result.completeness).toBe("insufficient");
  });

  it("returns not_evaluated_stale when only stale evidence is available", () => {
    const result = evaluate({
      context: context({
        evidence: [
          evidence({
            epistemicStatus: "stale",
            freshness: "stale",
            stalenessReason: "Synthetic stale fixture.",
          }),
        ],
      }),
    });
    expect(result.ledger[0]?.outcome).toBe("not_evaluated_stale");
  });

  it("returns insufficient_evidence when a required gate fails", () => {
    const result = evaluate({
      ruleSet: ruleSet({
        requiredGates: [
          {
            gateId: "profile_gate",
            description: "Requires a verified organization profile.",
            requiredEvidenceTypes: ["operating_context"],
          },
        ],
      }),
    });
    expect(result.fit).toEqual({ status: "insufficient_evidence" });
    expect(result.ledger[0]?.outcome).toBe("awarded");
  });

  it("records rule_disabled without awarding points", () => {
    const disabled = baseRule({
      ruleId: "rule_syn_test_disabled",
      enabled: false,
      maximumPoints: 40,
    });
    const enabled = baseRule({
      ruleId: "rule_syn_test_enabled",
      maximumPoints: 60,
    });
    const result = evaluate({
      ruleSet: ruleSet({ rules: [disabled, enabled] }),
    });
    const byId = Object.fromEntries(result.ledger.map((entry) => [entry.ruleId, entry]));
    expect(byId.rule_syn_test_disabled?.outcome).toBe("rule_disabled");
    expect(byId.rule_syn_test_disabled?.pointsAwarded).toBe(0);
    expect(byId.rule_syn_test_enabled?.outcome).toBe("awarded");
    if (result.fit.status === "assessed") {
      expect(result.fit.pointsAwarded).toBe(60);
      expect(result.fit.pointsPossible).toBe(60);
    }
  });

  it("returns invalid when validated provenance is required but missing", () => {
    const result = evaluate({
      context: context({
        evidence: [evidence({ provenanceId: null })],
        provenanceById: new Map(),
        fieldSources: { institution_kind: { evidenceIds: ["ev_syn_test_001"] } },
      }),
    });
    expect(result.fit).toEqual({ status: "invalid" });
    expect(result.ledger[0]?.outcome).toBe("invalid_input");
  });

  it("does not award points when field lineage is empty", () => {
    const result = evaluate({
      context: context({
        fieldSources: { institution_kind: { evidenceIds: [] } },
      }),
      ruleSet: ruleSet({
        rules: [
          baseRule({
            ruleId: "rule_syn_test_field_only",
            evidenceRequirements: {
              requiredEvidenceTypes: [],
              requireValidatedProvenance: false,
              allowStale: false,
              allowRestrictedInternal: false,
              allowInference: false,
            },
          }),
        ],
      }),
    });
    expect(result.ledger[0]?.outcome).toBe("not_evaluated_missing");
    expect(result.ledger[0]?.pointsAwarded).toBe(0);
    expect(result.ledger[0]?.reasonCode).toBe("missing_lineage");
  });

  it("fails closed on cross-tenant provenance for awards", () => {
    const result = evaluate({
      context: context({
        evidence: [evidence({ tenantId: "tenant_other_demo" })],
        fieldSources: { institution_kind: { evidenceIds: ["ev_syn_test_001"] } },
      }),
    });
    expect(result.ledger[0]?.outcome).toBe("invalid_input");
    expect(result.ledger[0]?.reasonCode).toBe("invalid_lineage");
    expect(result.ledger[0]?.pointsAwarded).toBe(0);
  });

  it("awarded ledger entries retain validated provenance summaries", () => {
    const result = evaluate({});
    const awarded = result.ledger.find((entry) => entry.outcome === "awarded");
    expect(awarded).toBeDefined();
    expect(awarded!.evidenceIds.length).toBeGreaterThan(0);
    expect(awarded!.provenanceSummaries.some((item) => item.validationStatus === "validated")).toBe(
      true,
    );
  });

  it("is deterministic for identical inputs", () => {
    const input = {
      ruleSet: ruleSet({
        rules: [
          baseRule({
            ruleId: "rule_syn_test_b",
            maximumPoints: 40,
            predicate: {
              type: "evidence_exists",
              evidenceTypes: ["organization_profile"],
            } satisfies Predicate,
          }),
          baseRule({
            ruleId: "rule_syn_test_a",
            maximumPoints: 60,
          }),
        ],
      }),
      context: context(),
    };
    const first = evaluate(input);
    const second = evaluate(input);
    expect(first).toEqual(second);
    expect(first.ledger.map((entry) => entry.ruleId)).toEqual([
      "rule_syn_test_a",
      "rule_syn_test_b",
    ]);
  });
});
