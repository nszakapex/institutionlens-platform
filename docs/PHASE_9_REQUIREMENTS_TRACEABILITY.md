# Phase 9 requirements traceability

**Scope:** Batch 1 - production architecture and schema

**Status:** Batch 1 complete for static schema-contract scope

**External infrastructure:** None created or connected

## Batch 1 requirements

| ID      | Requirement                                                                          | Classification | Evidence                                                                                              | Remaining limitation                                     |
| ------- | ------------------------------------------------------------------------------------ | -------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| P9B1-01 | Verify official Supabase/Postgres guidance and repository compatibility              | Implemented    | `PHASE_9_PLAN.md` official guidance review                                                            | Package versions remain Batch 2/3 decisions              |
| P9B1-02 | Define tenant and owner/analyst/viewer membership schema                             | Implemented    | `tenants`, `tenant_verticals`, `memberships` migration tables                                         | Auth resolution deferred to Batch 3                      |
| P9B1-03 | Define organization, provenance, evidence, and lineage schema                        | Implemented    | Migration tables plus `PRODUCTION_DATA_FOUNDATION.md` catalog                                         | No real data or source approval                          |
| P9B1-04 | Define assessment run/result and capability/rule result schema                       | Implemented    | `assessment_runs`, `assessment_results`, `capability_results`, `rule_results`, `rule_result_evidence` | Adapter and DB parity deferred to Batch 2/5              |
| P9B1-05 | Define overlay, saved comparison, brief snapshot, import-run, and audit-event schema | Implemented    | Migration tables and bounds                                                                           | Mutations/workflows remain deferred                      |
| P9B1-06 | Enforce tenant ownership and cross-tenant foreign references                         | Implemented    | Tenant-composite unique keys and foreign keys; schema contract tests                                  | Live two-tenant DB attack tests deferred to Batch 4      |
| P9B1-07 | Add safe constraints, indexes, and opaque refs                                       | Implemented    | Named SQL checks/indexes; static contract validator                                                   | Query plans require representative staging data          |
| P9B1-08 | Fail closed before RLS policies are approved                                         | Implemented    | API role revokes; RLS enabled/forced; no `CREATE POLICY`                                              | Narrow grants/policies intentionally deferred to Batch 4 |
| P9B1-09 | Define migration and rollback strategy                                               | Implemented    | `PRODUCTION_DATA_FOUNDATION.md`; destructive rollback file                                            | Execution/rehearsal blocked by missing local stack       |
| P9B1-10 | Define proposed data-retention policy without enforcing deletion                     | Implemented    | Retention table and nullable expiry fields                                                            | Legal/customer approval and purge jobs deferred          |
| P9B1-11 | Preserve synthetic offline runtime and Phase 4 methodology                           | Implemented    | No runtime adapter or assessment source edits; full regression evidence pending                       | Production runtime still unavailable by design           |
| P9B1-12 | Do not create external services or deploy                                            | Implemented    | Git-only SQL/docs/tests; no Supabase/Vercel command                                                   | External setup remains approval-gated                    |

## Verification evidence

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

## Deferred Phase 9 requirements

| Area                                                               | Batch                                          |
| ------------------------------------------------------------------ | ---------------------------------------------- |
| Production repository interfaces and Supabase/Postgres adapter     | 2                                              |
| Bounded database reads/writes, timeouts, transactions, safe errors | 2                                              |
| Supabase Auth, SSR sessions, invites/recovery, role resolution     | 3                                              |
| RLS policies, narrow grants/API surface, direct attack tests       | 4                                              |
| Environment cutover, health/readiness, demo-seed isolation         | 5                                              |
| Local/staging migration and rollback rehearsal                     | 5                                              |
| External Supabase project creation or remote migration             | Owner approval after Phase 9 code verification |
