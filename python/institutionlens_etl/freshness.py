"""Freshness evaluation relative to a fixed as-of timestamp."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone


def parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    dt = datetime.fromisoformat(normalized)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def evaluate_freshness(
    observed_at: str | None,
    *,
    as_of: str,
    current_days: int = 180,
    aging_days: int = 365,
) -> tuple[str, str | None]:
    """
    Returns (freshness, staleness_reason|None).
    unknown when observed_at missing; never invents current.
    """
    as_of_dt = parse_iso(as_of)
    observed = parse_iso(observed_at)
    if as_of_dt is None:
        return "unknown", None
    if observed is None:
        return "unknown", None
    age = as_of_dt - observed
    if age < timedelta(0):
        # Future-dated observations are treated as unknown (fail closed for freshness).
        return "unknown", None
    if age <= timedelta(days=current_days):
        return "current", None
    if age <= timedelta(days=aging_days):
        return "aging", None
    return "stale", "Observation exceeded the Phase 10 offline stale threshold."
