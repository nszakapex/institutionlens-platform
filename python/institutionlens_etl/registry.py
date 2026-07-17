"""Source registry loader and guards."""

from __future__ import annotations

import json
import re
from pathlib import Path

from institutionlens_etl import POLICY_VERSION
from institutionlens_etl.errors import LiveFetchForbiddenError, RegistryError
from institutionlens_etl.models import SourceRegistry, SourceRegistryEntry

SOURCE_ID_RE = re.compile(r"^src_[a-z0-9_]{1,48}$")
ALLOWED_CLASSES = {
    "offline_fixture",
    "public_registry",
    "public_notice",
    "public_website",
}
ALLOWED_LICENSE = {"synthetic_demo", "unknown", "permitted_internal"}
ALLOWED_ACCESS = {"synthetic", "internal", "restricted"}


def fixtures_dir() -> Path:
    return Path(__file__).resolve().parent / "fixtures"


def load_registry(path: Path | None = None) -> SourceRegistry:
    registry_path = path or (fixtures_dir() / "registry.json")
    try:
        raw = json.loads(registry_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RegistryError("Unable to read source registry.") from exc

    if not isinstance(raw, dict):
        raise RegistryError("Registry root must be an object.")

    registry_version = raw.get("registryVersion")
    policy_version = raw.get("policyVersion")
    sources_raw = raw.get("sources")
    if not isinstance(registry_version, str) or not registry_version:
        raise RegistryError("registryVersion is required.")
    if policy_version != POLICY_VERSION:
        raise RegistryError("policyVersion does not match ETL POLICY_VERSION.")
    if not isinstance(sources_raw, list) or len(sources_raw) == 0 or len(sources_raw) > 200:
        raise RegistryError("sources must be a non-empty array with at most 200 entries.")

    entries: list[SourceRegistryEntry] = []
    seen: set[str] = set()
    for item in sources_raw:
        if not isinstance(item, dict):
            raise RegistryError("Each source must be an object.")
        source_id = item.get("id")
        if not isinstance(source_id, str) or not SOURCE_ID_RE.match(source_id):
            raise RegistryError("Invalid source id.")
        if source_id in seen:
            raise RegistryError("Duplicate source id.")
        seen.add(source_id)

        class_name = item.get("class")
        if class_name not in ALLOWED_CLASSES:
            raise RegistryError("Unsupported source class.")
        license_status = item.get("licenseStatus")
        access = item.get("defaultAccessClassification")
        if license_status not in ALLOWED_LICENSE or access not in ALLOWED_ACCESS:
            raise RegistryError("Invalid license or access classification.")

        live_fetch = bool(item.get("liveFetch", False))
        fixture_uri = item.get("fixtureUri")
        if class_name == "offline_fixture":
            if live_fetch:
                raise RegistryError("offline_fixture sources must set liveFetch=false.")
            if not isinstance(fixture_uri, str) or not fixture_uri.startswith("fixture://"):
                raise RegistryError("offline_fixture requires fixture:// URI.")
        elif live_fetch:
            # Non-executable stubs must still keep liveFetch false in Phase 10.
            raise RegistryError("Phase 10 forbids liveFetch=true registry entries.")

        entries.append(
            SourceRegistryEntry(
                id=source_id,
                class_=class_name,
                display_name=str(item.get("displayName", ""))[:160],
                jurisdiction=str(item.get("jurisdiction", ""))[:64],
                license_status=license_status,
                default_access_classification=access,
                live_fetch=live_fetch,
                fixture_uri=fixture_uri if isinstance(fixture_uri, str) else None,
                notes=(str(item["notes"])[:400] if item.get("notes") is not None else None),
            )
        )

    return SourceRegistry(
        registry_version=registry_version,
        policy_version=policy_version,
        sources=tuple(entries),
    )


def require_executable_source(registry: SourceRegistry, source_id: str) -> SourceRegistryEntry:
    for entry in registry.sources:
        if entry.id == source_id:
            if entry.class_ != "offline_fixture" or entry.live_fetch:
                raise LiveFetchForbiddenError()
            return entry
    raise RegistryError("Source id is not registered.")
