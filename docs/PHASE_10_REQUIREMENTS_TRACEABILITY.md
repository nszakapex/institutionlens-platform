# Phase 10 requirements traceability

**Phase:** Institutional public-source and Python ETL foundation  
**Plan:** `docs/PHASE_10_PLAN.md`

| ID     | Requirement                                                 | Status      | Primary artifacts                                                                | Notes                           |
| ------ | ----------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------- | ------------------------------- |
| P10-01 | Authoritative plan + ADRs                                   | Implemented | `PHASE_10_PLAN.md`; D-027–D-029                                                  | Offline foundation only         |
| P10-02 | Public-source / legal-use policy                            | Implemented | `PUBLIC_SOURCE_POLICY.md`                                                        | No live fetch in this phase     |
| P10-03 | Versioned source registry                                   | Implemented | `SOURCE_REGISTRY.md`; `python/.../fixtures/registry.json`; TS mirror             | `live_fetch` must be false      |
| P10-04 | Python ETL package                                          | Implemented | `python/institutionlens_etl/`                                                    | Stdlib + unittest               |
| P10-05 | Normalize / provenance / freshness / idempotency / validate | Implemented | `normalize.py`, `provenance.py`, `freshness.py`, `idempotency.py`, `validate.py` | Fail closed                     |
| P10-06 | Deterministic evidence mapping                              | Implemented | `map_evidence.py`; `src/ingestion/`                                              | Domain-compatible candidates    |
| P10-07 | Offline fixtures + CLI                                      | Implemented | `fixtures/`; `cli.py`; `npm run test:phase10-etl`                                | No network                      |
| P10-08 | Human-review queue                                          | Implemented | `review.py`; TS `ReviewQueueItemSchema`                                          | Uncertain/restricted/rejected   |
| P10-09 | Monitoring / audit diagnostics                              | Implemented | `diagnostics.py`; safe summaries only                                            | No payloads/secrets             |
| P10-10 | Preserve Phase 4 + synthetic app default                    | Implemented | Plan + contracts; no app route wiring                                            | Explicit offline mode only      |
| P10-11 | Cross-runtime contract tests                                | Implemented | `src/ingestion/*.test.ts`; Python tests                                          | Expected fixture JSON           |
| P10-12 | Full verify integration                                     | Implemented | `package.json` scripts                                                           | `verify` includes Phase 10 gate |

## Deferred (later phases)

| Item                                                                        | Reason                                                              |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Privileged DB write into `import_runs` / evidence                           | Requires mutation contract + audit (Phase 11+)                      |
| Live approved connectors                                                    | Owner-gated; policy + credentials + robots/ToS review               |
| Staging/production ETL runners                                              | No deploy/env cutover in this phase                                 |
| Domain `ProvenanceRecordSchema` live sourceType expansion for synthetic app | Import uses separate ingestion schemas to avoid breaking local-demo |

## Live-data gate checklist

- [x] No scraper / downloader code paths that execute by default
- [x] Registry entries used by CLI have `live_fetch: false`
- [x] CLI rejects `live_fetch: true` and non-fixture URIs
- [x] No third-party credentials required
- [x] No Supabase/Vercel/Auth modifications
- [x] No Git push from this phase’s implementation mandate
