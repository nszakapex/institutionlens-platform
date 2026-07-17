"""Safe monitoring / audit diagnostics (no payloads or secrets)."""

from __future__ import annotations

from typing import Any

from institutionlens_etl.models import PipelineResult


def build_diagnostics(result: PipelineResult) -> list[dict[str, Any]]:
    evidence_by_status: dict[str, int] = {}
    for item in result.evidence:
        evidence_by_status[item.epistemic_status] = evidence_by_status.get(item.epistemic_status, 0) + 1

    review_by_reason: dict[str, int] = {}
    for item in result.review_queue:
        review_by_reason[item.reason_code] = review_by_reason.get(item.reason_code, 0) + 1

    events = [
        {
            "event": "import_run_completed",
            "status": result.manifest.status,
            "packId": result.manifest.pack_id,
            "dryRun": result.manifest.dry_run,
            "counts": dict(result.manifest.record_counts),
            "safeErrorSummary": result.manifest.safe_error_summary,
        },
        {
            "event": "evidence_epistemic_histogram",
            "counts": evidence_by_status,
        },
        {
            "event": "review_reason_histogram",
            "counts": review_by_reason,
        },
    ]

    # Refuse to attach candidate bodies, source_reference, or checksums beyond presence flags.
    for event in events:
        assert "source_reference" not in event
        assert "private_notes" not in event
    return events


def assert_no_forbidden_diagnostic_keys(events: list[dict[str, Any]]) -> None:
    forbidden = {
        "source_reference",
        "sourceReference",
        "private_notes",
        "privateNotes",
        "password",
        "token",
        "authorization",
    }
    for event in events:
        for key in event:
            if key in forbidden:
                raise AssertionError(f"Forbidden diagnostic key: {key}")
            value = event[key]
            if isinstance(value, str) and value.startswith("fixture://"):
                # fixture URIs are ok in manifests but not in diagnostics summaries
                if event.get("event") != "import_run_completed":
                    raise AssertionError("Diagnostics must not echo fixture URIs.")
