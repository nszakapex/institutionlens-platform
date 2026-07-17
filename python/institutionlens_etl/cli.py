"""Safe offline CLI for InstitutionLens Phase 10 ETL."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from institutionlens_etl.errors import EtlError, LiveFetchForbiddenError
from institutionlens_etl.pipeline import run_offline_pack, write_result
from institutionlens_etl.registry import fixtures_dir, load_registry


def _cmd_validate_registry(_: argparse.Namespace) -> int:
    registry = load_registry()
    executable = [s.id for s in registry.sources if s.class_ == "offline_fixture"]
    print(
        json.dumps(
            {
                "ok": True,
                "registryVersion": registry.registry_version,
                "policyVersion": registry.policy_version,
                "sourceCount": len(registry.sources),
                "executableSourceCount": len(executable),
            },
            indent=2,
        )
    )
    return 0


def _cmd_run_fixture(args: argparse.Namespace) -> int:
    result = run_offline_pack(args.pack, dry_run=not args.commit_artifact)
    if args.output:
        write_result(result, Path(args.output))
    print(
        json.dumps(
            {
                "ok": result.manifest.status in {"succeeded", "partial"},
                "status": result.manifest.status,
                "counts": result.manifest.record_counts,
                "reviewCount": len(result.review_queue),
                "dryRun": result.manifest.dry_run,
            },
            indent=2,
        )
    )
    return 0 if result.manifest.status != "failed" else 1


def _cmd_review_queue(args: argparse.Namespace) -> int:
    result = run_offline_pack(args.pack, dry_run=True)
    print(
        json.dumps(
            {
                "ok": True,
                "packId": args.pack,
                "items": [
                    {
                        "reviewId": item.review_id,
                        "reasonCode": item.reason_code,
                        "severity": item.severity,
                        "recommendedPublication": item.recommended_publication,
                    }
                    for item in result.review_queue
                ],
            },
            indent=2,
        )
    )
    return 0


def _cmd_diagnostics(args: argparse.Namespace) -> int:
    result = run_offline_pack(args.pack, dry_run=True)
    print(json.dumps({"ok": True, "diagnostics": list(result.diagnostics)}, indent=2))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="il-etl",
        description="InstitutionLens Phase 10 offline ETL (fixtures only; no network).",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_reg = sub.add_parser("validate-registry", help="Validate offline source registry")
    p_reg.set_defaults(func=_cmd_validate_registry)

    p_run = sub.add_parser("run-fixture", help="Run an offline fixture pack")
    p_run.add_argument("--pack", required=True, help="Fixture pack id under fixtures/packs/")
    p_run.add_argument(
        "--output",
        help="Optional path to write full candidate JSON (still offline; no DB write)",
    )
    p_run.add_argument(
        "--commit-artifact",
        action="store_true",
        help="Mark manifest dry_run=false for local artifact emission only (never writes to DB)",
    )
    p_run.set_defaults(func=_cmd_run_fixture)

    p_rev = sub.add_parser("review-queue", help="Emit review queue summary for a pack")
    p_rev.add_argument("--pack", required=True)
    p_rev.set_defaults(func=_cmd_review_queue)

    p_diag = sub.add_parser("diagnostics", help="Emit safe diagnostics for a pack")
    p_diag.add_argument("--pack", required=True)
    p_diag.set_defaults(func=_cmd_diagnostics)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        # Refuse accidental network-looking args.
        joined = " ".join(argv or sys.argv[1:]).lower()
        if "http://" in joined or "https://" in joined:
            raise LiveFetchForbiddenError()
        return int(args.func(args))
    except EtlError as exc:
        print(json.dumps({"ok": False, "code": exc.code, "error": exc.public_message}))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
