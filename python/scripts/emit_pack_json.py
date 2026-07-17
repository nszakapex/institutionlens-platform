"""Emit offline pack JSON for TypeScript contract tests. Usage: python scripts/emit_pack_json.py <pack_id>"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from institutionlens_etl.pipeline import run_offline_pack  # noqa: E402


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: emit_pack_json.py <pack_id>", file=sys.stderr)
        return 2
    pack_id = sys.argv[1]
    result = run_offline_pack(pack_id)
    sys.stdout.write(json.dumps(result.to_json_dict(), separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
