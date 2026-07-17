"""Provenance candidate construction."""

from __future__ import annotations

from institutionlens_etl.models import NormalizedRecord, ProvenanceCandidate, SourceRegistryEntry

SOURCE_TYPE_BY_CLASS = {
    "offline_fixture": "synthetic_fixture",
    "public_registry": "registry",
    "public_notice": "regulatory_filing",
    "public_website": "website",
}


def build_source_reference(entry: SourceRegistryEntry, record_id: str) -> str:
    # Server-only candidate field. Offline fixtures use fixture:// or .example labels.
    if entry.fixture_uri:
        return f"{entry.fixture_uri.rstrip('/')}/{record_id}"
    return f"fixture://unregistered/{entry.id}/{record_id}.example"


def build_provenance(
    normalized: NormalizedRecord,
    entry: SourceRegistryEntry,
    *,
    tenant_id: str,
    provenance_id: str,
    created_at: str,
) -> ProvenanceCandidate:
    source_type = SOURCE_TYPE_BY_CLASS.get(entry.class_, "synthetic_fixture")
    validation = "validated" if normalized.match_confidence == "exact" else "unvalidated"
    if normalized.license_status == "unknown":
        validation = "unvalidated"
    if normalized.access_classification == "restricted":
        validation = "unvalidated"

    return ProvenanceCandidate(
        id=provenance_id,
        tenant_id=tenant_id,
        source_type=source_type,
        source_name=entry.display_name,
        source_reference=build_source_reference(entry, normalized.record_id),
        retrieved_at=normalized.retrieved_at,
        published_at=normalized.published_at,
        reporting_period=None,
        checksum=normalized.content_fingerprint,
        license_status=normalized.license_status,
        access_classification=normalized.access_classification,
        validation_status=validation,
        synthetic=entry.class_ == "offline_fixture",
        data_classification=(
            "synthetic" if entry.class_ == "offline_fixture" else normalized.access_classification
        ),
        notes=None,
        created_at=created_at,
    )
