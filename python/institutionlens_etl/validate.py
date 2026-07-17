"""Candidate validation against InstitutionLens evidence invariants."""

from __future__ import annotations

import re

from institutionlens_etl.errors import ValidationRejectedError
from institutionlens_etl.models import EvidenceCandidate, ProvenanceCandidate

ORG_ID_RE = re.compile(r"^org_[a-z0-9_]{1,48}$")
EV_ID_RE = re.compile(r"^ev_[a-z0-9_]{1,48}$")
PROV_ID_RE = re.compile(r"^prov_[a-z0-9_]{1,48}$")
TENANT_ID_RE = re.compile(r"^tenant_[a-z0-9_]{1,48}$")
HEX64_RE = re.compile(r"^[0-9a-f]{64}$")

EVIDENCE_TYPES = {
    "organization_profile",
    "capability_signal",
    "public_change_signal",
    "data_availability",
    "operating_context",
}
EPISTEMIC = {"verified", "calculated", "rule_based", "inference", "missing", "stale"}
PUBLICATION = {"restricted", "internal_only", "review_required", "eligible"}


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ValidationRejectedError(message)


def validate_provenance(item: ProvenanceCandidate) -> None:
    _require(bool(PROV_ID_RE.match(item.id)), "Invalid provenance id.")
    _require(bool(TENANT_ID_RE.match(item.tenant_id)), "Invalid tenant id.")
    _require(bool(HEX64_RE.match(item.checksum)), "Checksum must be sha256 hex.")
    _require(
        item.source_reference.startswith("fixture://") or item.source_reference.endswith(".example"),
        "source_reference must be fixture:// or .example.",
    )
    _require("?" not in item.source_reference and "#" not in item.source_reference, "Unsafe ref.")
    if item.validation_status == "validated":
        _require(item.license_status != "unknown", "Validated provenance cannot use unknown license.")


def validate_evidence(item: EvidenceCandidate, provenance: ProvenanceCandidate | None) -> None:
    _require(bool(EV_ID_RE.match(item.id)), "Invalid evidence id.")
    _require(bool(ORG_ID_RE.match(item.organization_id)), "Invalid organization id.")
    _require(bool(TENANT_ID_RE.match(item.tenant_id)), "Invalid tenant id.")
    _require(item.evidence_type in EVIDENCE_TYPES, "Unsupported evidence type.")
    _require(item.epistemic_status in EPISTEMIC, "Unsupported epistemic status.")
    _require(item.publication_eligibility in PUBLICATION, "Unsupported publication eligibility.")
    _require(item.publication_eligibility != "eligible", "Phase 10 offline candidates cannot be eligible.")

    if item.epistemic_status == "missing":
        _require(item.observation is None, "Missing evidence cannot include observation.")
    if item.epistemic_status == "verified":
        _require(item.provenance_id is not None and provenance is not None, "Verified needs provenance.")
        assert provenance is not None
        _require(provenance.validation_status == "validated", "Verified needs validated provenance.")
        _require(provenance.license_status != "unknown", "Verified cannot use unknown license.")
    if item.epistemic_status == "stale":
        _require(item.observation is not None, "Stale evidence must keep observation.")
        _require(bool(item.staleness_reason), "Stale evidence needs staleness_reason.")
    if item.epistemic_status == "inference":
        _require(item.publication_eligibility != "eligible", "Inference cannot be eligible.")
    if provenance and item.tenant_id != provenance.tenant_id:
        raise ValidationRejectedError("Evidence/provenance tenant mismatch.")
    if provenance and item.provenance_id != provenance.id:
        raise ValidationRejectedError("Evidence provenance_id mismatch.")
