"""Offline fixture pipeline orchestration."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from institutionlens_etl.diagnostics import build_diagnostics
from institutionlens_etl.errors import EtlError, PolicyRejectedError
from institutionlens_etl.idempotency import checksum_records, idempotency_key
from institutionlens_etl.map_evidence import evidence_id_for, map_evidence, provenance_id_for
from institutionlens_etl.models import (
    ImportRunManifest,
    PipelineResult,
    RawSourceRecord,
)
from institutionlens_etl.normalize import normalize_record
from institutionlens_etl.policy import assert_source_executable
from institutionlens_etl.provenance import build_provenance
from institutionlens_etl.registry import fixtures_dir, load_registry, require_executable_source
from institutionlens_etl.review import build_review_items
from institutionlens_etl.validate import validate_evidence, validate_provenance

DEFAULT_AS_OF = "2026-04-01T12:00:00.000Z"
DEFAULT_TENANT = "tenant_demo_research"
CONTRACT_VERSION = "1.0.0"


def _load_pack(pack_id: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    pack_dir = fixtures_dir() / "packs" / pack_id
    meta_path = pack_dir / "pack.json"
    records_path = pack_dir / "records.json"
    if not meta_path.is_file() or not records_path.is_file():
        raise PolicyRejectedError("Unknown or incomplete offline fixture pack.")
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    records = json.loads(records_path.read_text(encoding="utf-8"))
    if not isinstance(meta, dict) or not isinstance(records, list):
        raise PolicyRejectedError("Fixture pack shape is invalid.")
    return meta, records


def run_offline_pack(
    pack_id: str,
    *,
    as_of: str = DEFAULT_AS_OF,
    tenant_id: str = DEFAULT_TENANT,
    dry_run: bool = True,
) -> PipelineResult:
    registry = load_registry()
    meta, records_raw = _load_pack(pack_id)
    source_id = meta.get("sourceId")
    if not isinstance(source_id, str):
        raise PolicyRejectedError("Fixture pack missing sourceId.")

    source = require_executable_source(registry, source_id)
    assert_source_executable(source)

    input_checksum = checksum_records(records_raw)
    key = idempotency_key(source_id, pack_id, input_checksum)

    evidence_out = []
    provenance_out = []
    review_out = []
    errors = 0

    for raw_dict in records_raw:
        try:
            raw = RawSourceRecord(
                record_id=str(raw_dict["recordId"]),
                source_id=str(raw_dict["sourceId"]),
                organization_domain_id=str(raw_dict["organizationDomainId"]),
                title=str(raw_dict["title"]),
                summary=str(raw_dict["summary"]),
                observed_at=raw_dict.get("observedAt"),
                published_at=raw_dict.get("publishedAt"),
                retrieved_at=str(raw_dict["retrievedAt"]),
                text_body=str(raw_dict["textBody"]),
                evidence_type=str(raw_dict["evidenceType"]),
                match_confidence=str(raw_dict["matchConfidence"]),
                access_hint=raw_dict.get("accessHint"),
                license_hint=raw_dict.get("licenseHint"),
            )
            if raw.source_id != source_id:
                raise PolicyRejectedError("Record sourceId does not match pack source.")

            normalized = normalize_record(raw, source)
            prov_id = provenance_id_for(normalized.organization_domain_id, normalized.record_id)
            provenance = build_provenance(
                normalized,
                source,
                tenant_id=tenant_id,
                provenance_id=prov_id,
                created_at=normalized.retrieved_at,
            )
            validate_provenance(provenance)
            evidence = map_evidence(
                normalized,
                provenance,
                tenant_id=tenant_id,
                as_of=as_of,
            )
            # Keep ids aligned with helpers even if map_evidence changes later.
            if evidence.id != evidence_id_for(normalized.organization_domain_id, normalized.record_id):
                raise PolicyRejectedError("Non-deterministic evidence id mapping.")
            validate_evidence(evidence, provenance if evidence.provenance_id else None)
            evidence_out.append(evidence)
            provenance_out.append(provenance)
            review_out.extend(
                build_review_items(normalized, evidence, created_at=normalized.retrieved_at)
            )
        except EtlError:
            errors += 1

    status = "succeeded"
    if errors and evidence_out:
        status = "partial"
    elif errors and not evidence_out:
        status = "failed"

    manifest = ImportRunManifest(
        source_key=f"ilstg_phase10_{pack_id}",
        idempotency_key=key,
        input_checksum=input_checksum,
        contract_version=CONTRACT_VERSION,
        source_policy_version=registry.policy_version,
        status=status,
        dry_run=dry_run,
        record_counts={
            "input": len(records_raw),
            "evidence": len(evidence_out),
            "provenance": len(provenance_out),
            "review": len(review_out),
            "errors": errors,
        },
        safe_error_summary=("one or more records rejected" if errors else None),
        pack_id=pack_id,
        created_at=as_of,
    )

    result = PipelineResult(
        manifest=manifest,
        evidence=tuple(evidence_out),
        provenance=tuple(provenance_out),
        review_queue=tuple(review_out),
        diagnostics=(),
    )
    diagnostics = build_diagnostics(result)
    return PipelineResult(
        manifest=result.manifest,
        evidence=result.evidence,
        provenance=result.provenance,
        review_queue=result.review_queue,
        diagnostics=tuple(diagnostics),
    )


def write_result(result: PipelineResult, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(result.to_json_dict(), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
