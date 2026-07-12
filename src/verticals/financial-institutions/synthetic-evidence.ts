import "server-only";

import type { EvidenceRecord } from "@/domain/schemas/evidence";
import { EvidenceRecordSchema } from "@/domain/schemas/evidence";
import type { ProvenanceRecord } from "@/domain/schemas/provenance";
import { ProvenanceRecordSchema } from "@/domain/schemas/provenance";
import { assertEvidenceInvariants } from "@/domain/invariants";
import { DEMO_DOMAIN_TENANT_ID } from "@/domain/demo-constants";
import {
  FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
  FINANCIAL_INSTITUTIONS_VERTICAL_ID,
} from "@/verticals/financial-institutions/schema";
import { buildSyntheticOrganizations } from "@/verticals/financial-institutions/synthetic-organizations";

const CREATED = "2026-01-15T12:00:00.000Z";
const UPDATED = "2026-03-01T15:30:00.000Z";
const OBSERVED = "2026-02-01T12:00:00.000Z";
const STALE_OBSERVED = "2023-08-15T12:00:00.000Z";

function pad(n: number): string {
  return String(n).padStart(3, "0");
}

function checksum(seed: string): string {
  // Deterministic fake checksum — not cryptographic; 64 hex chars.
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const base = h.toString(16).padStart(8, "0");
  return base.repeat(8).slice(0, 64);
}

type Pattern =
  | "complete"
  | "partial"
  | "stale"
  | "restricted"
  | "missing_value"
  | "missing_provenance"
  | "inference";

function patternFor(n: number): Pattern {
  if ([1, 5, 9, 15, 16, 19, 21, 22, 24].includes(n)) return "complete";
  if ([2, 7, 13, 20].includes(n)) return "partial";
  if ([3, 10, 18].includes(n)) return "stale";
  if ([4, 12, 23].includes(n)) return "restricted";
  if ([6, 17].includes(n)) return "missing_provenance";
  if ([11].includes(n)) return "missing_value";
  return "inference";
}

export function buildSyntheticProvenanceAndEvidence(): {
  provenance: readonly ProvenanceRecord[];
  evidence: readonly EvidenceRecord[];
} {
  const organizations = buildSyntheticOrganizations();
  const provenance: ProvenanceRecord[] = [];
  const evidence: EvidenceRecord[] = [];

  for (const org of organizations) {
    const n = Number(org.id.slice(-3));
    const pattern = patternFor(n);
    const orgKey = pad(n);

    const baseProvId = `prov_syn_fi_${orgKey}_profile`;
    let provenanceRecord: ProvenanceRecord | null = null;

    if (pattern !== "missing_provenance" && pattern !== "missing_value") {
      provenanceRecord = ProvenanceRecordSchema.parse({
        id: baseProvId,
        tenantId: DEMO_DOMAIN_TENANT_ID,
        sourceType: "synthetic_fixture",
        sourceName: `Synthetic profile fixture for ${org.displayName}`,
        sourceReference: `synthetic://financial-institutions/${org.id}/profile`,
        retrievedAt: OBSERVED,
        publishedAt: OBSERVED,
        reportingPeriod: null,
        checksum: checksum(org.id),
        licenseStatus: pattern === "restricted" ? "unknown" : "synthetic_demo",
        accessClassification: pattern === "restricted" ? "restricted" : "synthetic",
        validationStatus: "validated",
        synthetic: true,
        dataClassification: "synthetic",
        notes: "Synthetic provenance for architecture validation only.",
        createdAt: CREATED,
        domainSchemaVersion: "1.0.0",
      });
      provenance.push(provenanceRecord);
    }

    if (pattern === "missing_value") {
      const missing = EvidenceRecordSchema.parse({
        id: `ev_syn_fi_${orgKey}_profile`,
        tenantId: DEMO_DOMAIN_TENANT_ID,
        organizationId: org.id,
        verticalId: FINANCIAL_INSTITUTIONS_VERTICAL_ID,
        adapterVersion: FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
        evidenceType: "organization_profile",
        epistemicStatus: "missing",
        title: "Organization profile observation",
        summary: "Profile observation is missing for this synthetic record.",
        observation: null,
        observedAt: null,
        effectivePeriod: null,
        freshness: "unknown",
        confidence: "unknown",
        provenanceId: null,
        publicationEligibility: "restricted",
        synthetic: true,
        dataClassification: "synthetic",
        createdAt: CREATED,
        updatedAt: UPDATED,
        domainSchemaVersion: "1.0.0",
      });
      assertEvidenceInvariants(missing, null);
      evidence.push(missing);
      continue;
    }

    if (pattern === "missing_provenance" || pattern === "inference") {
      const inference = EvidenceRecordSchema.parse({
        id: `ev_syn_fi_${orgKey}_profile`,
        tenantId: DEMO_DOMAIN_TENANT_ID,
        organizationId: org.id,
        verticalId: FINANCIAL_INSTITUTIONS_VERTICAL_ID,
        adapterVersion: FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
        evidenceType: "organization_profile",
        epistemicStatus: "inference",
        title: "Inferred operating context",
        summary:
          "Synthetic inference without publication eligibility. Not verified and not a real assessment.",
        observation: {
          kind: "category",
          value: "inferred_operating_context",
        },
        observedAt: OBSERVED,
        effectivePeriod: null,
        freshness: "aging",
        confidence: "low",
        provenanceId: null,
        publicationEligibility: "internal_only",
        synthetic: true,
        dataClassification: "synthetic",
        createdAt: CREATED,
        updatedAt: UPDATED,
        domainSchemaVersion: "1.0.0",
      });
      assertEvidenceInvariants(inference, null);
      evidence.push(inference);
      continue;
    }

    if (pattern === "stale") {
      const stale = EvidenceRecordSchema.parse({
        id: `ev_syn_fi_${orgKey}_profile`,
        tenantId: DEMO_DOMAIN_TENANT_ID,
        organizationId: org.id,
        verticalId: FINANCIAL_INSTITUTIONS_VERTICAL_ID,
        adapterVersion: FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
        evidenceType: "organization_profile",
        epistemicStatus: "stale",
        title: "Stale organization profile observation",
        summary: "Preserved synthetic observation marked stale for interface validation.",
        observation: {
          kind: "band",
          value: "band_m",
          label: "Historical synthetic scale band",
        },
        observedAt: STALE_OBSERVED,
        effectivePeriod: { start: STALE_OBSERVED, end: "2024-08-15T12:00:00.000Z" },
        freshness: "stale",
        confidence: "moderate",
        provenanceId: baseProvId,
        publicationEligibility: "review_required",
        synthetic: true,
        dataClassification: "synthetic",
        stalenessReason: "Observation age exceeds synthetic freshness window for demo fixtures.",
        createdAt: CREATED,
        updatedAt: UPDATED,
        domainSchemaVersion: "1.0.0",
      });
      assertEvidenceInvariants(stale, provenanceRecord);
      evidence.push(stale);
      continue;
    }

    if (pattern === "restricted") {
      const restricted = EvidenceRecordSchema.parse({
        id: `ev_syn_fi_${orgKey}_profile`,
        tenantId: DEMO_DOMAIN_TENANT_ID,
        organizationId: org.id,
        verticalId: FINANCIAL_INSTITUTIONS_VERTICAL_ID,
        adapterVersion: FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
        evidenceType: "data_availability",
        epistemicStatus: "rule_based",
        title: "Restricted synthetic data-availability note",
        summary:
          "Synthetic restricted observation — unknown license blocks publication eligibility.",
        observation: {
          kind: "category",
          value: "restricted_synthetic",
        },
        observedAt: OBSERVED,
        effectivePeriod: null,
        freshness: "current",
        confidence: "moderate",
        provenanceId: baseProvId,
        publicationEligibility: "restricted",
        synthetic: true,
        dataClassification: "restricted",
        ruleSetRef: "ruleset_syn_fi_availability@deferred",
        createdAt: CREATED,
        updatedAt: UPDATED,
        domainSchemaVersion: "1.0.0",
      });
      assertEvidenceInvariants(restricted, provenanceRecord);
      evidence.push(restricted);
      continue;
    }

    if (pattern === "partial") {
      const partial = EvidenceRecordSchema.parse({
        id: `ev_syn_fi_${orgKey}_profile`,
        tenantId: DEMO_DOMAIN_TENANT_ID,
        organizationId: org.id,
        verticalId: FINANCIAL_INSTITUTIONS_VERTICAL_ID,
        adapterVersion: FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
        evidenceType: "operating_context",
        epistemicStatus: "calculated",
        title: "Partial operating-context calculation",
        summary: "Synthetic calculated observation with explicit descriptor — incomplete profile.",
        observation: {
          kind: "category_list",
          values: ["partial_profile", "awaiting_additional_signals"],
        },
        observedAt: OBSERVED,
        effectivePeriod: null,
        freshness: "current",
        confidence: "low",
        provenanceId: baseProvId,
        publicationEligibility: "internal_only",
        synthetic: true,
        dataClassification: "synthetic",
        calculationDescriptor: "synthetic_partial_profile_v1",
        createdAt: CREATED,
        updatedAt: UPDATED,
        domainSchemaVersion: "1.0.0",
      });
      assertEvidenceInvariants(partial, provenanceRecord);
      evidence.push(partial);
      continue;
    }

    // complete / verified
    const verified = EvidenceRecordSchema.parse({
      id: `ev_syn_fi_${orgKey}_profile`,
      tenantId: DEMO_DOMAIN_TENANT_ID,
      organizationId: org.id,
      verticalId: FINANCIAL_INSTITUTIONS_VERTICAL_ID,
      adapterVersion: FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
      evidenceType: "organization_profile",
      epistemicStatus: "verified",
      title: "Verified synthetic organization profile",
      summary: "Synthetic verified profile observation with validated provenance.",
      observation: {
        kind: "category",
        value: org.organizationType,
      },
      observedAt: OBSERVED,
      effectivePeriod: null,
      freshness: "current",
      confidence: "high",
      provenanceId: baseProvId,
      publicationEligibility: "internal_only",
      synthetic: true,
      dataClassification: "synthetic",
      createdAt: CREATED,
      updatedAt: UPDATED,
      domainSchemaVersion: "1.0.0",
    });
    assertEvidenceInvariants(verified, provenanceRecord);
    evidence.push(verified);

    // Additional public change signal evidence for complete orgs with signals
    const changeEv = EvidenceRecordSchema.parse({
      id: `ev_syn_fi_${orgKey}_change`,
      tenantId: DEMO_DOMAIN_TENANT_ID,
      organizationId: org.id,
      verticalId: FINANCIAL_INSTITUTIONS_VERTICAL_ID,
      adapterVersion: FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
      evidenceType: "public_change_signal",
      epistemicStatus: "verified",
      title: "Synthetic public change signal",
      summary: "Synthetic timing/change signal for interface validation only.",
      observation: {
        kind: "text",
        value: "Synthetic change signal recorded in fixture set.",
      },
      observedAt: OBSERVED,
      effectivePeriod: null,
      freshness: "current",
      confidence: "moderate",
      provenanceId: baseProvId,
      publicationEligibility: "internal_only",
      synthetic: true,
      dataClassification: "synthetic",
      createdAt: CREATED,
      updatedAt: UPDATED,
      domainSchemaVersion: "1.0.0",
    });
    assertEvidenceInvariants(changeEv, provenanceRecord);
    evidence.push(changeEv);
  }

  return {
    provenance: Object.freeze(provenance),
    evidence: Object.freeze(evidence),
  };
}
