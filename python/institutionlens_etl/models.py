"""Typed ETL models (stdlib dataclasses)."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class SourceRegistryEntry:
    id: str
    class_: str
    display_name: str
    jurisdiction: str
    license_status: str
    default_access_classification: str
    live_fetch: bool
    fixture_uri: str | None = None
    notes: str | None = None


@dataclass(frozen=True)
class SourceRegistry:
    registry_version: str
    policy_version: str
    sources: tuple[SourceRegistryEntry, ...]


@dataclass(frozen=True)
class RawSourceRecord:
    record_id: str
    source_id: str
    organization_domain_id: str
    title: str
    summary: str
    observed_at: str | None
    published_at: str | None
    retrieved_at: str
    text_body: str
    evidence_type: str
    match_confidence: str  # exact | probable | ambiguous | none
    access_hint: str | None = None
    license_hint: str | None = None


@dataclass(frozen=True)
class NormalizedRecord:
    record_id: str
    source_id: str
    organization_domain_id: str
    title: str
    summary: str
    observed_at: str | None
    published_at: str | None
    retrieved_at: str
    normalized_text: str
    evidence_type: str
    match_confidence: str
    content_fingerprint: str
    access_classification: str
    license_status: str


@dataclass(frozen=True)
class ProvenanceCandidate:
    id: str
    tenant_id: str
    source_type: str
    source_name: str
    source_reference: str
    retrieved_at: str | None
    published_at: str | None
    reporting_period: dict[str, str] | None
    checksum: str
    license_status: str
    access_classification: str
    validation_status: str
    synthetic: bool
    data_classification: str
    notes: str | None
    created_at: str
    domain_schema_version: str = "1.0.0"


@dataclass(frozen=True)
class EvidenceCandidate:
    id: str
    tenant_id: str
    organization_id: str
    vertical_id: str
    adapter_version: str
    evidence_type: str
    epistemic_status: str
    title: str
    summary: str
    observation: dict[str, Any] | None
    observed_at: str | None
    effective_period: dict[str, str] | None
    freshness: str
    confidence: str
    provenance_id: str | None
    publication_eligibility: str
    synthetic: bool
    data_classification: str
    created_at: str
    updated_at: str
    domain_schema_version: str = "1.0.0"
    staleness_reason: str | None = None
    rule_set_ref: str | None = None
    calculation_descriptor: str | None = None
    calculated_from_evidence_ids: tuple[str, ...] = ()


@dataclass(frozen=True)
class ReviewQueueItem:
    review_id: str
    reason_code: str
    severity: str
    source_id: str
    record_id: str
    organization_domain_id: str | None
    summary: str
    recommended_publication: str
    created_at: str


@dataclass(frozen=True)
class ImportRunManifest:
    source_key: str
    idempotency_key: str
    input_checksum: str
    contract_version: str
    source_policy_version: str
    status: str
    dry_run: bool
    record_counts: dict[str, int]
    safe_error_summary: str | None
    pack_id: str
    created_at: str


@dataclass(frozen=True)
class PipelineResult:
    manifest: ImportRunManifest
    evidence: tuple[EvidenceCandidate, ...]
    provenance: tuple[ProvenanceCandidate, ...]
    review_queue: tuple[ReviewQueueItem, ...]
    diagnostics: tuple[dict[str, Any], ...] = field(default_factory=tuple)

    def to_json_dict(self) -> dict[str, Any]:
        return {
            "manifest": asdict(self.manifest),
            "evidence": [asdict(item) for item in self.evidence],
            "provenance": [asdict(item) for item in self.provenance],
            "reviewQueue": [asdict(item) for item in self.review_queue],
            "diagnostics": list(self.diagnostics),
        }
