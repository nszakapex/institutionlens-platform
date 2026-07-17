# InstitutionLens ETL (Phase 10)

Offline-only public-source ETL foundation. No network fetch, no credentials, no database writes.

## Quick start

```bash
cd python
python -m institutionlens_etl.cli validate-registry
python -m institutionlens_etl.cli run-fixture --pack demo_notices
python -m unittest discover -s tests -v
```

From repo root:

```bash
npm run test:phase10-etl
```

## Layout

- `institutionlens_etl/` — package
- `institutionlens_etl/fixtures/` — offline registry + raw packs + expected outputs
- `tests/` — unittest suite

See `docs/PHASE_10_PLAN.md` and `docs/PUBLIC_SOURCE_POLICY.md`.
