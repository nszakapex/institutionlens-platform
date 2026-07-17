"""Normalization helpers."""

from __future__ import annotations

import hashlib
import re

from institutionlens_etl.models import NormalizedRecord, RawSourceRecord, SourceRegistryEntry

_WHITESPACE = re.compile(r"\s+")


def normalize_text(value: str) -> str:
    collapsed = _WHITESPACE.sub(" ", value.strip())
    return collapsed[:4000]


def content_fingerprint(parts: list[str]) -> str:
    material = "\n".join(parts).encode("utf-8")
    return hashlib.sha256(material).hexdigest()


def normalize_record(raw: RawSourceRecord, source: SourceRegistryEntry) -> NormalizedRecord:
    normalized_text = normalize_text(raw.text_body)
    title = normalize_text(raw.title)[:160]
    summary = normalize_text(raw.summary)[:600]
    access = raw.access_hint or source.default_access_classification
    license_status = raw.license_hint or source.license_status
    fingerprint = content_fingerprint(
        [
            raw.source_id,
            raw.organization_domain_id,
            title,
            summary,
            normalized_text,
            raw.observed_at or "",
            raw.published_at or "",
        ]
    )
    return NormalizedRecord(
        record_id=raw.record_id,
        source_id=raw.source_id,
        organization_domain_id=raw.organization_domain_id,
        title=title,
        summary=summary,
        observed_at=raw.observed_at,
        published_at=raw.published_at,
        retrieved_at=raw.retrieved_at,
        normalized_text=normalized_text,
        evidence_type=raw.evidence_type,
        match_confidence=raw.match_confidence,
        content_fingerprint=fingerprint,
        access_classification=access,
        license_status=license_status,
    )
