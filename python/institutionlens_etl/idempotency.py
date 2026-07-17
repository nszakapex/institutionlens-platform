"""Idempotency and import-run checksum helpers."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from institutionlens_etl.errors import IdempotencyError


def sha256_hex(material: str | bytes) -> str:
    if isinstance(material, str):
        material = material.encode("utf-8")
    return hashlib.sha256(material).hexdigest()


def idempotency_key(source_id: str, pack_id: str, input_checksum: str) -> str:
    if not source_id or not pack_id or not input_checksum:
        raise IdempotencyError()
    return sha256_hex(f"{source_id}|{pack_id}|{input_checksum}")


def checksum_records(records: list[dict[str, Any]]) -> str:
    # Canonical JSON for stable offline checksums.
    payload = json.dumps(records, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return sha256_hex(payload)
