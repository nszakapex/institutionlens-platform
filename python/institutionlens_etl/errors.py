"""Fail-closed ETL errors with safe public codes (no payload echo)."""

from __future__ import annotations


class EtlError(Exception):
    """Base ETL failure."""

    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.public_message = message
        super().__init__(f"{code}: {message}")


class PolicyRejectedError(EtlError):
    def __init__(self, message: str = "Source or policy gate rejected the batch.") -> None:
        super().__init__("POLICY_REJECTED", message)


class ValidationRejectedError(EtlError):
    def __init__(self, message: str = "Candidate failed evidence/provenance validation.") -> None:
        super().__init__("VALIDATION_REJECTED", message)


class LiveFetchForbiddenError(EtlError):
    def __init__(self) -> None:
        super().__init__(
            "LIVE_FETCH_FORBIDDEN",
            "Phase 10 refuses live fetch, scraping, and non-fixture network sources.",
        )


class RegistryError(EtlError):
    def __init__(self, message: str = "Source registry is invalid or incomplete.") -> None:
        super().__init__("REGISTRY_INVALID", message)


class IdempotencyError(EtlError):
    def __init__(self, message: str = "Idempotency key or checksum missing/invalid.") -> None:
        super().__init__("IDEMPOTENCY_INVALID", message)
