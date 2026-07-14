# Phase 9 requirements traceability

**Scope:** Batches 1-2 - production schema plus repository/configuration boundary

**Status:** Batches 1-2 complete for static/offline scope

**External infrastructure:** None created or connected

## Batch 1 requirements

| ID      | Requirement                                                                          | Classification | Evidence                                                                                              | Remaining limitation                                     |
| ------- | ------------------------------------------------------------------------------------ | -------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| P9B1-01 | Verify official Supabase/Postgres guidance and repository compatibility              | Implemented    | `PHASE_9_PLAN.md` official guidance review                                                            | Runtime/SSR package pinning remains a Batch 3 decision   |
| P9B1-02 | Define tenant and owner/analyst/viewer membership schema                             | Implemented    | `tenants`, `tenant_verticals`, `memberships` migration tables                                         | Auth resolution deferred to Batch 3                      |
| P9B1-03 | Define organization, provenance, evidence, and lineage schema                        | Implemented    | Migration tables plus `PRODUCTION_DATA_FOUNDATION.md` catalog                                         | No real data or source approval                          |
| P9B1-04 | Define assessment run/result and capability/rule result schema                       | Implemented    | `assessment_runs`, `assessment_results`, `capability_results`, `rule_results`, `rule_result_evidence` | Live database parity deferred to Batch 5                 |
| P9B1-05 | Define overlay, saved comparison, brief snapshot, import-run, and audit-event schema | Implemented    | Migration tables and bounds                                                                           | Mutations/workflows remain deferred                      |
| P9B1-06 | Enforce tenant ownership and cross-tenant foreign references                         | Implemented    | Tenant-composite unique keys and foreign keys; schema contract tests                                  | Live two-tenant DB attack tests deferred to Batch 4      |
| P9B1-07 | Add safe constraints, indexes, and opaque refs                                       | Implemented    | Named SQL checks/indexes; static contract validator                                                   | Query plans require representative staging data          |
| P9B1-08 | Fail closed before RLS policies are approved                                         | Implemented    | API role revokes; RLS enabled/forced; no `CREATE POLICY`                                              | Narrow grants/policies intentionally deferred to Batch 4 |
| P9B1-09 | Define migration and rollback strategy                                               | Implemented    | `PRODUCTION_DATA_FOUNDATION.md`; destructive rollback file                                            | Execution/rehearsal blocked by missing local stack       |
| P9B1-10 | Define proposed data-retention policy without enforcing deletion                     | Implemented    | Retention table and nullable expiry fields                                                            | Legal/customer approval and purge jobs deferred          |
| P9B1-11 | Preserve synthetic offline runtime and Phase 4 methodology                           | Implemented    | Default route wiring unchanged; production adapter has no generator imports; full regression passes   | Live production runtime remains unavailable by design    |
| P9B1-12 | Do not create external services or deploy                                            | Implemented    | Git-only SQL/docs/tests; no Supabase/Vercel command                                                   | External setup remains approval-gated                    |

## Batch 2 requirements

| ID      | Requirement                                                                  | Classification | Evidence                                                                                                                              | Remaining limitation                                              |
| ------- | ---------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| P9B2-01 | Define typed contracts for every current read domain                         | Implemented    | Existing repository interfaces plus `repository-contracts.ts` bundle for workspace, comparisons, and brief snapshots                  | Mutation contracts intentionally absent                           |
| P9B2-02 | Preserve synthetic adapters behind the same contracts                        | Implemented    | `synthetic-repository-bundle.ts`; contract parity tests                                                                               | Saved records remain empty because current demo is non-persistent |
| P9B2-03 | Add a server-only Supabase/Postgres adapter structure                        | Implemented    | `supabase-postgres/gateway.ts` and `adapter.ts`; server-boundary contract                                                             | No SDK transport, RPC, or live row decoder yet                    |
| P9B2-04 | Validate production configuration without exposing values                    | Implemented    | `repository-config.ts`; valid/missing/malformed/mixed/secret-safety tests                                                             | Real project values require owner approval                        |
| P9B2-05 | Prevent production-like fallback to demo                                     | Implemented    | Explicit provider mode selection; production missing-gateway test proves synthetic factory is not called                              | Application cutover remains Batch 5                               |
| P9B2-06 | Bound queries, sorts, pagination, and timeouts                               | Implemented    | Zod allowlists; page <=10,000; page size <=50/config cap; operation runner timeout; focused tests                                     | Keyset pagination and measured query plans remain live work       |
| P9B2-07 | Keep reference resolution tenant-scoped and fail closed                      | Implemented    | `getByPublicRef` contract/synthetic implementation; gateway authorization envelope; recursive tenant-response rejection; tests        | Direct RLS attack tests remain Batch 4                            |
| P9B2-08 | Classify repository failures safely                                          | Implemented    | Constant `RepositoryError` messages; upstream/configuration value and no-log tests                                                    | Error telemetry remains Phase 12                                  |
| P9B2-09 | Preserve restricted-evidence, overlay, and private-note boundaries           | Implemented    | Restricted response guard, `overlay:read` repository checks, private-note stripping, unsafe snapshot-content rejection                | RLS policy enforcement remains Batch 4                            |
| P9B2-10 | Keep production configuration and repository internals out of client modules | Implemented    | `server-only` imports; static client-boundary scan; actual rendered-view-model privacy test                                           | Browser network/RSC inspection repeats at cutover                 |
| P9B2-11 | Consume persisted Phase 4 results without recalculation                      | Implemented    | Production adapter/gateway have no generator/fixture imports; fake persisted-output pass-through test; Phase 4 regression suite       | Live DB parity remains Batch 5                                    |
| P9B2-12 | Avoid new global mutable caches                                              | Implemented    | Per-invocation provider/runner; production boundary static contract                                                                   | Existing pre-Batch-2 synthetic assessment cache remains unchanged |
| P9B2-13 | Make no external, deployment, migration, or default-runtime change           | Implemented    | No dependency/lockfile, runtime route, migration, Vercel, or external service changes                                                 | All external configuration remains approval-gated                 |
| P9B2-14 | Record live PostgreSQL gates honestly                                        | Implemented    | `PRODUCTION_DATA_FOUNDATION.md`, Phase 9 plan, and this matrix require migration/RPC/RLS/attack/parity/query-plan/rollback validation | Mandatory before production claim                                 |

## Batch 1 verification evidence

Recorded on 2026-07-13:

| Check                          | Result                                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test:database`        | Pass - 1 file / 7 tests, including weakened-RLS, cross-tenant, cross-organization, premature-policy, restricted-search, and rollback mutations |
| `npm run validate:database`    | Pass - 18 tables, RLS enabled/forced, no allow policies                                                                                        |
| `npm run test:security`        | Pass - 14 files / 75 tests                                                                                                                     |
| `npm run test:assessment`      | Pass - 9 files / 56 tests                                                                                                                      |
| `npm run validate:methodology` | Pass - unchanged 5-capability / 30-rule methodology                                                                                            |
| `npm run validate:assessments` | Pass - unchanged 24-organization assessment partitions and 233 awarded lineage rows                                                            |
| `npm run verify`               | Pass - 43 files / 280 tests; all validators, scans, and production build                                                                       |
| Secrets / clean-room           | Pass - no credential, customer-data, or source-material finding                                                                                |
| Phase 4 source diff            | No modified file under `src/assessment/**` or `src/verticals/financial-institutions/assessment/**`                                             |
| Browser checks                 | Not applicable - no UI, route, or runtime behavior changed                                                                                     |
| PostgreSQL execution           | Not run - no Docker-compatible runtime or Supabase CLI on this machine; local execution/rehearsal remains explicit Batch 4-5 work              |

## Batch 2 verification evidence

Recorded on 2026-07-13:

| Check                                | Result                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `npm run test:repositories`          | Pass - 6 files / 38 tests                                                                                                 |
| Focused auth/server-boundary tests   | Pass - 4 files / 28 tests                                                                                                 |
| `npm run test:security`              | Pass - 18 files / 100 tests                                                                                               |
| `npm run typecheck` / `npm run lint` | Pass                                                                                                                      |
| Rendered privacy contract            | Pass - Overview, detail, comparison, and brief outputs contain no raw IDs or repository configuration                     |
| Phase 4 source boundary              | Production adapter imports no assessment generator or FI assessment implementation; no scoring/methodology source changed |
| Full `npm run verify`                | Pass - 47 files / 305 tests; all validators, scans, and production build, with documented local-demo process variables    |
| Fail-closed environment preflight    | Confirmed - the first unconfigured run stopped in three existing demo-context tests; no implicit demo fallback occurred   |
| Phase 4 regression                   | Pass - 9 files / 56 tests; methodology UI remains 5 capabilities / 30 rules / 100 points each; 233 awarded lineage rows   |
| Browser checks                       | Not run - no UI, route output, or default runtime wiring changed                                                          |
| Supabase/PostgreSQL integration      | Not run or claimed - gateway tests use typed fakes only                                                                   |
| External infrastructure / deployment | None created, connected, changed, or triggered                                                                            |

## Deferred Phase 9 requirements

| Area                                                           | Batch                                          |
| -------------------------------------------------------------- | ---------------------------------------------- |
| Authenticated Supabase SDK transport and session binding       | 3                                              |
| Narrow RPC implementation and live row decoders                | 4                                              |
| First mutation's bounded transaction and audit contract        | Phase 10/11 batch that introduces the mutation |
| Supabase Auth, SSR sessions, invites/recovery, role resolution | 3                                              |
| RLS policies, narrow grants/API surface, direct attack tests   | 4                                              |
| Environment cutover, health/readiness, demo-seed isolation     | 5                                              |
| Local/staging migration and rollback rehearsal                 | 5                                              |
| External Supabase project creation or remote migration         | Owner approval after Phase 9 code verification |
