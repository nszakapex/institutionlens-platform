"""Deterministic mapping from normalized records to evidence candidates."""

from __future__ import annotations

import re

from institutionlens_etl.freshness import evaluate_freshness
from institutionlens_etl.models import EvidenceCandidate, NormalizedRecord, ProvenanceCandidate
from institutionlens_etl.policy import publication_for_license

_SLUG_RE = re.compile(r"[^a-z0-9_]+")


def stable_slug(value: str, *, max_len: int = 40) -> str:
    slug = _SLUG_RE.sub("_", value.lower()).strip("_")
    return (slug or "record")[:max_len]


def evidence_id_for(organization_id: str, record_id: str) -> str:
    return f"ev_off_{stable_slug(organization_id, max_len=12)}_{stable_slug(record_id, max_len=24)}"


def provenance_id_for(organization_id: str, record_id: str) -> str:
    return f"prov_off_{stable_slug(organization_id, max_len=12)}_{stable_slug(record_id, max_len=22)}"


def observation_for(normalized: NormalizedRecord) -> dict | None:
    text = normalized.normalized_text[:500]
    if not text:
        return None
    return {"kind": "text", "value": text}


def map_evidence(
    normalized: NormalizedRecord,
    provenance: ProvenanceCandidate,
    *,
    tenant_id: str,
    as_of: str,
    vertical_id: str = "financial_institutions",
    adapter_version: str = "1.0.0",
) -> EvidenceCandidate:
    freshness, stale_reason = evaluate_freshness(normalized.observed_at, as_of=as_of)
    publication = publication_for_license(
        normalized.license_status, normalized.access_classification
    )

    epistemic = "verified"
    confidence = "high"
    if normalized.match_confidence in {"probable", "ambiguous", "none"}:
        epistemic = "inference"
        confidence = "low"
        publication = "review_required" if publication != "restricted" else "restricted"
    if normalized.license_status == "unknown":
        epistemic = "inference"
        confidence = "low"
        publication = "review_required"
    if freshness == "stale":
        epistemic = "stale"
        confidence = "low"
        publication = "review_required" if publication != "restricted" else "restricted"
    if normalized.access_classification == "restricted":
        publication = "restricted"
        confidence = "low"

    # Verified path only when exact match + validated provenance + non-unknown license + not stale.
    if (
        epistemic == "verified"
        and provenance.validation_status != "validated"
    ):
        epistemic = "inference"
        publication = "review_required" if publication != "restricted" else "restricted"
        confidence = "low"

    observation = observation_for(normalized)
    if observation is None:
        epistemic = "missing"
        publication = "restricted"
        confidence = "unknown"

    created = normalized.retrieved_at
    return EvidenceCandidate(
        id=evidence_id_for(normalized.organization_domain_id, normalized.record_id),
        tenant_id=tenant_id,
        organization_id=normalized.organization_domain_id,
        vertical_id=vertical_id,
        adapter_version=adapter_version,
        evidence_type=normalized.evidence_type,
        epistemic_status=epistemic,
        title=normalized.title,
        summary=normalized.summary,
        observation=observation,
        observed_at=normalized.observed_at,
        effective_period=None,
        freshness=freshness,
        confidence=confidence,
        provenance_id=provenance.id if epistemic != "missing" else None,
        publication_eligibility=publication,
        synthetic=provenance.synthetic,
        data_classification=provenance.data_classification,
        created_at=created,
        updated_at=created,
        staleness_reason=stale_reason if epistemic == "stale" else None,
    )
