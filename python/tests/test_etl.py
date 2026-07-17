"""Unit tests for InstitutionLens Phase 10 offline ETL."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from institutionlens_etl.cli import main
from institutionlens_etl.diagnostics import assert_no_forbidden_diagnostic_keys
from institutionlens_etl.errors import LiveFetchForbiddenError, PolicyRejectedError
from institutionlens_etl.freshness import evaluate_freshness
from institutionlens_etl.idempotency import checksum_records, idempotency_key
from institutionlens_etl.pipeline import run_offline_pack, write_result
from institutionlens_etl.policy import assert_offline_uri
from institutionlens_etl.registry import load_registry


class RegistryTests(unittest.TestCase):
    def test_registry_loads_and_forbids_live_fetch_entries(self) -> None:
        registry = load_registry()
        self.assertEqual(registry.policy_version, "1.0.0")
        self.assertTrue(any(s.id == "src_off_demo_notices" for s in registry.sources))
        self.assertTrue(all(s.live_fetch is False for s in registry.sources))


class PolicyTests(unittest.TestCase):
    def test_offline_uri_gate(self) -> None:
        assert_offline_uri("fixture://phase10/demo_notices")
        assert_offline_uri("notice.example")
        with self.assertRaises(LiveFetchForbiddenError):
            assert_offline_uri("https://example.com/x")


class FreshnessTests(unittest.TestCase):
    def test_freshness_bands(self) -> None:
        as_of = "2026-04-01T12:00:00.000Z"
        self.assertEqual(evaluate_freshness("2026-01-01T00:00:00.000Z", as_of=as_of)[0], "current")
        self.assertEqual(evaluate_freshness("2025-06-01T00:00:00.000Z", as_of=as_of)[0], "aging")
        status, reason = evaluate_freshness("2024-01-01T00:00:00.000Z", as_of=as_of)
        self.assertEqual(status, "stale")
        self.assertIsNotNone(reason)
        self.assertEqual(evaluate_freshness(None, as_of=as_of)[0], "unknown")


class IdempotencyTests(unittest.TestCase):
    def test_stable_checksum_and_key(self) -> None:
        records = [{"a": 1, "b": "x"}, {"a": 2}]
        checksum = checksum_records(records)
        self.assertEqual(len(checksum), 64)
        self.assertEqual(checksum, checksum_records([{"b": "x", "a": 1}, {"a": 2}]))
        key = idempotency_key("src_off_demo_notices", "demo_notices", checksum)
        self.assertEqual(len(key), 64)


class PipelineTests(unittest.TestCase):
    def test_demo_notices_succeeds_with_verified_candidates(self) -> None:
        result = run_offline_pack("demo_notices")
        self.assertEqual(result.manifest.status, "succeeded")
        self.assertEqual(result.manifest.record_counts["evidence"], 2)
        self.assertTrue(all(item.publication_eligibility != "eligible" for item in result.evidence))
        self.assertTrue(any(item.epistemic_status == "verified" for item in result.evidence))
        for prov in result.provenance:
            self.assertTrue(prov.source_reference.startswith("fixture://"))
            self.assertNotIn("?", prov.source_reference)

    def test_demo_mixed_routes_review_queue(self) -> None:
        result = run_offline_pack("demo_mixed")
        self.assertIn(result.manifest.status, {"succeeded", "partial"})
        reasons = {item.reason_code for item in result.review_queue}
        self.assertIn("ambiguous_organization_match", reasons)
        self.assertIn("unknown_license", reasons)
        self.assertIn("restricted_access", reasons)
        self.assertIn("stale_observation", reasons)
        self.assertTrue(any(e.publication_eligibility == "restricted" for e in result.evidence))
        assert_no_forbidden_diagnostic_keys(list(result.diagnostics))

    def test_unknown_pack_fails_closed(self) -> None:
        with self.assertRaises(PolicyRejectedError):
            run_offline_pack("does_not_exist")

    def test_write_artifact_roundtrip(self) -> None:
        result = run_offline_pack("demo_notices", dry_run=False)
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "out.json"
            write_result(result, path)
            payload = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(payload["manifest"]["status"], "succeeded")
            self.assertEqual(len(payload["evidence"]), 2)


class CliTests(unittest.TestCase):
    def test_cli_validate_registry(self) -> None:
        self.assertEqual(main(["validate-registry"]), 0)

    def test_cli_rejects_http_args(self) -> None:
        self.assertEqual(main(["run-fixture", "--pack", "https://evil.example"]), 2)

    def test_cli_run_fixture(self) -> None:
        self.assertEqual(main(["run-fixture", "--pack", "demo_notices"]), 0)


if __name__ == "__main__":
    unittest.main()
