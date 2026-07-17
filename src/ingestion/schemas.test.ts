import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { PipelineArtifactSchema, SourceRegistrySchema } from "@/ingestion/schemas";
import { assertEvidenceInvariants } from "@/domain/invariants";
import type { EvidenceRecord } from "@/domain/schemas/evidence";
import type { ProvenanceRecord } from "@/domain/schemas/provenance";

const root = process.cwd();
const pythonRoot = path.join(root, "python");
const registryPath = path.join(pythonRoot, "institutionlens_etl", "fixtures", "registry.json");

function runPythonPack(packId: string): unknown {
  const result = spawnSync("python", ["scripts/emit_pack_json.py", packId], {
    cwd: pythonRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "python pipeline failed");
  }
  return JSON.parse(result.stdout);
}

function toDomainEvidence(raw: Record<string, unknown>): EvidenceRecord {
  return {
    id: raw.id as EvidenceRecord["id"],
    tenantId: raw.tenant_id as EvidenceRecord["tenantId"],
    organizationId: raw.organization_id as EvidenceRecord["organizationId"],
    verticalId: raw.vertical_id as EvidenceRecord["verticalId"],
    adapterVersion: raw.adapter_version as EvidenceRecord["adapterVersion"],
    evidenceType: raw.evidence_type as EvidenceRecord["evidenceType"],
    epistemicStatus: raw.epistemic_status as EvidenceRecord["epistemicStatus"],
    title: raw.title as string,
    summary: raw.summary as string,
    observation: raw.observation as EvidenceRecord["observation"],
    observedAt: raw.observed_at as EvidenceRecord["observedAt"],
    effectivePeriod: raw.effective_period as EvidenceRecord["effectivePeriod"],
    freshness: raw.freshness as EvidenceRecord["freshness"],
    confidence: raw.confidence as EvidenceRecord["confidence"],
    provenanceId: raw.provenance_id as EvidenceRecord["provenanceId"],
    publicationEligibility: raw.publication_eligibility as EvidenceRecord["publicationEligibility"],
    synthetic: Boolean(raw.synthetic),
    dataClassification: raw.data_classification as EvidenceRecord["dataClassification"],
    createdAt: raw.created_at as EvidenceRecord["createdAt"],
    updatedAt: raw.updated_at as EvidenceRecord["updatedAt"],
    domainSchemaVersion: "1.0.0",
    ...(raw.staleness_reason ? { stalenessReason: raw.staleness_reason as string } : {}),
  };
}

function toDomainProvenance(raw: Record<string, unknown>): ProvenanceRecord {
  return {
    id: raw.id as ProvenanceRecord["id"],
    tenantId: raw.tenant_id as ProvenanceRecord["tenantId"],
    sourceType: "synthetic_fixture",
    sourceName: raw.source_name as string,
    sourceReference: raw.source_reference as string,
    retrievedAt: raw.retrieved_at as ProvenanceRecord["retrievedAt"],
    publishedAt: raw.published_at as ProvenanceRecord["publishedAt"],
    reportingPeriod: raw.reporting_period as ProvenanceRecord["reportingPeriod"],
    checksum: raw.checksum as ProvenanceRecord["checksum"],
    licenseStatus: raw.license_status as ProvenanceRecord["licenseStatus"],
    accessClassification: raw.access_classification as ProvenanceRecord["accessClassification"],
    validationStatus: raw.validation_status as ProvenanceRecord["validationStatus"],
    synthetic: Boolean(raw.synthetic),
    dataClassification: raw.data_classification as ProvenanceRecord["dataClassification"],
    createdAt: raw.created_at as ProvenanceRecord["createdAt"],
    domainSchemaVersion: "1.0.0",
  };
}

describe("Phase 10 ingestion contracts", () => {
  it("parses the offline source registry", () => {
    const registry = SourceRegistrySchema.parse(JSON.parse(readFileSync(registryPath, "utf8")));
    expect(registry.sources.some((source) => source.id === "src_off_demo_notices")).toBe(true);
    expect(registry.sources.every((source) => source.liveFetch === false)).toBe(true);
  });

  it("accepts demo_notices pipeline artifacts and preserves evidence invariants", () => {
    const artifact = PipelineArtifactSchema.parse(runPythonPack("demo_notices"));
    expect(artifact.manifest.status).toBe("succeeded");
    expect(artifact.evidence.length).toBeGreaterThan(0);
    expect(artifact.evidence.every((row) => row.publication_eligibility !== "eligible")).toBe(true);

    for (const evidence of artifact.evidence) {
      const provenance = artifact.provenance.find((row) => row.id === evidence.provenance_id);
      assertEvidenceInvariants(
        toDomainEvidence(evidence as unknown as Record<string, unknown>),
        provenance ? toDomainProvenance(provenance as unknown as Record<string, unknown>) : null,
      );
    }
  });

  it("accepts demo_mixed artifacts with a non-empty review queue", () => {
    const artifact = PipelineArtifactSchema.parse(runPythonPack("demo_mixed"));
    expect(artifact.reviewQueue.length).toBeGreaterThan(0);
    expect(
      artifact.diagnostics.every(
        (event) => !("source_reference" in event) && !("private_notes" in event),
      ),
    ).toBe(true);
  });
});
