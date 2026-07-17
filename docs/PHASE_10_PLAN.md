# Phase 10 — Institutional public-source and Python ETL foundation

**Status:** Code-only foundation (offline fixtures). No live fetch, no credentials, no Supabase write path, no app runtime cutover.  
**Depends on:** Phases 4–9 (methodology lock, evidence/provenance invariants, `import_runs` schema, RLS/RPC read boundary).

## Goal

Establish an authoritative, fail-closed pipeline for **approved public institutional sources** that can eventually produce evidence and provenance candidates for the existing InstitutionLens read model — without changing Phase 4 scores, without scraping, and without altering default synthetic app behavior.

## Non-goals (this phase)

- Live HTTP(S) download, scraping, or browser automation against real sources
- Third-party API keys, customer data, or tenant-provided document vaults
- Supabase/Vercel/Auth configuration changes or migrations that enable writes
- Mutating production/staging application tables
- Investment recommendations or marketing overlays as “evidence”
- Recalculating Phase 4 fit scores inside the ETL
- Changing default `IL_APP_MODE=local-demo` synthetic UI behavior

## Architecture

```text
Offline fixture pack / (future) approved connector
        │
        ▼
Source registry + public-source policy gate
        │
        ▼
Python ETL (normalize → provenance → freshness → validate → map)
        │
        ├─► EvidenceImportCandidate JSON (domain-compatible)
        ├─► ProvenanceImportCandidate JSON (server-only fields allowed)
        ├─► ImportRunManifest (idempotency / checksum / status)
        └─► HumanReviewQueueItem[] (uncertain / restricted / rejected)
                │
                ▼
TypeScript ingestion contracts (parse + invariant checks)
                │
                ▼
(Future Phase 11+) privileged write path → import_runs → evidence/provenance
```

Default product runtime continues to use the synthetic repository bundle. An explicit, tested **offline import validation mode** exists only in CLI/validators — not as a silent app fallback.

## Workstreams

| ID     | Deliverable                                                       |
| ------ | ----------------------------------------------------------------- |
| P10-01 | Plan, ADRs (D-027–D-029), requirements traceability               |
| P10-02 | Public-source / legal-use policy                                  |
| P10-03 | Versioned source registry (offline-only entries)                  |
| P10-04 | Python package `institutionlens_etl`                              |
| P10-05 | Deterministic mapping into evidence/provenance candidate boundary |
| P10-06 | Offline fixtures + safe CLI                                       |
| P10-07 | Human-review queue contracts                                      |
| P10-08 | Monitoring/audit diagnostics (safe summaries only)                |
| P10-09 | TypeScript ingestion contracts + cross-runtime fixture tests      |
| P10-10 | `npm`/`python` verification wiring                                |

## Preserve (hard)

- Phase 4 methodology, weights, bands, gates, and no second calculator
- Tenant/RLS/privacy: no raw UUID PKs, no `private_notes` / `source_reference` on client wire
- Evidence epistemic/publication invariants (`src/domain/invariants.ts`)
- No investment recommendations
- Clean-room independence (`docs/CLEAN_ROOM_POLICY.md`)
- Fail-closed configuration (no demo↔live silent fallback)

## Live-data gate (must remain closed)

Phase 10 CLI and Python package **refuse** any operation that would:

1. fetch a non-`.example` network URL;
2. read credentials from env for source APIs;
3. write to Supabase / Postgres;
4. mark registry entries with `live_fetch: true` as executable.

## Verification

- `python -m unittest` / `npm run test:phase10-etl`
- TypeScript ingestion contract tests
- Full `npm run verify`
- Scans: secrets, clean-room, assets

## Related docs

- `docs/PUBLIC_SOURCE_POLICY.md`
- `docs/SOURCE_REGISTRY.md`
- `docs/PHASE_10_REQUIREMENTS_TRACEABILITY.md`
- `docs/EVIDENCE_AND_PROVENANCE.md`
- `docs/PRODUCTION_DATA_FOUNDATION.md` (`import_runs`)
- Decisions D-027, D-028, D-029 in `docs/DECISIONS.md`
