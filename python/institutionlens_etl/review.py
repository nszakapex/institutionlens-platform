"""Human-review queue construction."""

from __future__ import annotations

from institutionlens_etl.models import EvidenceCandidate, NormalizedRecord, ReviewQueueItem
from institutionlens_etl.map_evidence import stable_slug


def build_review_items(
    normalized: NormalizedRecord,
    evidence: EvidenceCandidate,
    *,
    created_at: str,
) -> list[ReviewQueueItem]:
    items: list[ReviewQueueItem] = []

    def add(reason: str, severity: str, summary: str) -> None:
        review_id = f"rev_off_{stable_slug(reason, max_len=16)}_{stable_slug(normalized.record_id, max_len=20)}"
        items.append(
            ReviewQueueItem(
                review_id=review_id,
                reason_code=reason,
                severity=severity,
                source_id=normalized.source_id,
                record_id=normalized.record_id,
                organization_domain_id=normalized.organization_domain_id,
                summary=summary[:400],
                recommended_publication=evidence.publication_eligibility,
                created_at=created_at,
            )
        )

    if normalized.match_confidence in {"ambiguous", "none"}:
        add(
            "ambiguous_organization_match",
            "high",
            "Organization match is ambiguous or missing; do not persist as verified.",
        )
    if normalized.match_confidence == "probable":
        add(
            "probable_organization_match",
            "moderate",
            "Organization match is probable only; requires human confirmation.",
        )
    if normalized.license_status == "unknown":
        add(
            "unknown_license",
            "high",
            "License status unknown; publication eligibility blocked.",
        )
    if normalized.access_classification == "restricted":
        add(
            "restricted_access",
            "high",
            "Access classification is restricted; withhold from broad publication.",
        )
    if evidence.epistemic_status == "stale":
        add(
            "stale_observation",
            "moderate",
            "Observation is stale relative to as-of timestamp.",
        )
    if evidence.publication_eligibility == "review_required":
        # Ensure at least one queue row when review is required.
        if not items:
            add(
                "review_required",
                "moderate",
                "Candidate requires human review before any broader use.",
            )

    return items
