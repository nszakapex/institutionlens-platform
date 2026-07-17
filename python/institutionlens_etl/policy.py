"""Public-source policy gates."""

from __future__ import annotations

from institutionlens_etl.errors import LiveFetchForbiddenError, PolicyRejectedError
from institutionlens_etl.models import SourceRegistryEntry


def assert_offline_uri(uri: str) -> None:
    if uri.startswith("fixture://"):
        return
    if uri.endswith(".example"):
        return
    raise LiveFetchForbiddenError()


def assert_source_executable(entry: SourceRegistryEntry) -> None:
    if entry.live_fetch:
        raise LiveFetchForbiddenError()
    if entry.class_ != "offline_fixture":
        raise PolicyRejectedError("Only offline_fixture sources are executable in Phase 10.")
    if not entry.fixture_uri:
        raise PolicyRejectedError("Executable source missing fixtureUri.")
    assert_offline_uri(entry.fixture_uri)


def publication_for_license(license_status: str, access_classification: str) -> str:
    if access_classification == "restricted":
        return "restricted"
    if license_status == "unknown":
        return "review_required"
    if license_status == "synthetic_demo":
        return "internal_only"
    if license_status == "permitted_internal":
        return "internal_only"
    return "review_required"
