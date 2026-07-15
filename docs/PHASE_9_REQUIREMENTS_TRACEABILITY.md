# Phase 9 requirements traceability

**Scope:** Batches 1-2, Batch 3 live-migration preparation, corrective default privileges (applied), Batch 4 authenticated read RLS (applied on staging), staging RLS attack-test gate (executed)

**Status:** Batches 1-2 complete; Batch 3 prep complete; corrective applied; Batch 4 RLS migration applied on staging; staging RLS attack-test gate 17/17 passed and cleaned; Auth/session binding and narrow RPC pending

**External infrastructure:** Staging project `qzidcqtaabubvtycstwy`; linked via ignored metadata; `20260713190000` + `20260715181000` + `20260715200000` applied; live verifier 12/12; no residual Auth users or application rows after attack cleanup; no deployment

## Batch 1 requirements

| ID      | Requirement                                                                          | Classification | Evidence                                                                                              | Remaining limitation                                     |
| ------- | ------------------------------------------------------------------------------------ | -------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| P9B1-01 | Verify official Supabase/Postgres guidance and repository compatibility              | Implemented    | `PHASE_9_PLAN.md` official guidance review                                                            | Runtime/SSR package pinning remains a Batch 3 decision   |
| P9B1-02 | Define tenant and owner/analyst/viewer membership schema                             | Implemented    | `tenants`, `tenant_verticals`, `memberships` migration tables                                         | Auth resolution deferred to Batch 3                      |
| P9B1-03 | Define organization, provenance, evidence, and lineage schema                        | Implemented    | Migration tables plus `PRODUCTION_DATA_FOUNDATION.md` catalog                                         | No real data or source approval                          |
| P9B1-04 | Define assessment run/result and capability/rule result schema                       | Implemented    | `assessment_runs`, `assessment_results`, `capability_results`, `rule_results`, `rule_result_evidence` | Live database parity deferred to Batch 5                 |
| P9B1-05 | Define overlay, saved comparison, brief snapshot, import-run, and audit-event schema | Implemented    | Migration tables and bounds                                                                           | Mutations/workflows remain deferred                      |
| P9B1-06 | Enforce tenant ownership and cross-tenant foreign references                         | Implemented    | Tenant-composite unique keys and foreign keys; schema contract tests; staging attack cases 2/16       | App Auth/session binding still Batch 3 remainder         |
| P9B1-07 | Add safe constraints, indexes, and opaque refs                                       | Implemented    | Named SQL checks/indexes; static contract validator                                                   | Query plans require representative staging data          |
| P9B1-08 | Fail closed before RLS policies are approved                                         | Implemented    | API role revokes; RLS enabled/forced; no `CREATE POLICY`                                              | Narrow grants/policies intentionally deferred to Batch 4 |
| P9B1-09 | Define migration and rollback strategy                                               | Implemented    | `PRODUCTION_DATA_FOUNDATION.md`; destructive rollback file                                            | Execution/rehearsal blocked by missing local stack       |
| P9B1-10 | Define proposed data-retention policy without enforcing deletion                     | Implemented    | Retention table and nullable expiry fields                                                            | Legal/customer approval and purge jobs deferred          |
| P9B1-11 | Preserve synthetic offline runtime and Phase 4 methodology                           | Implemented    | Default route wiring unchanged; production adapter has no generator imports; full regression passes   | Live production runtime remains unavailable by design    |
| P9B1-12 | Do not create external services or deploy                                            | Implemented    | Batch 1 was Git-only SQL/docs/tests; no Supabase/Vercel command                                       | Staging project was created later with owner approval    |

## Batch 2 requirements

| ID      | Requirement                                                                  | Classification | Evidence                                                                                                                              | Remaining limitation                                              |
| ------- | ---------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| P9B2-01 | Define typed contracts for every current read domain                         | Implemented    | Existing repository interfaces plus `repository-contracts.ts` bundle for workspace, comparisons, and brief snapshots                  | Mutation contracts intentionally absent                           |
| P9B2-02 | Preserve synthetic adapters behind the same contracts                        | Implemented    | `synthetic-repository-bundle.ts`; contract parity tests                                                                               | Saved records remain empty because current demo is non-persistent |
| P9B2-03 | Add a server-only Supabase/Postgres adapter structure                        | Implemented    | `supabase-postgres/gateway.ts` and `adapter.ts`; server-boundary contract                                                             | No SDK transport, RPC, or live row decoder yet                    |
| P9B2-04 | Validate production configuration without exposing values                    | Implemented    | `repository-config.ts`; valid/missing/malformed/mixed/secret-safety tests                                                             | Real project values require owner approval                        |
| P9B2-05 | Prevent production-like fallback to demo                                     | Implemented    | Explicit provider mode selection; production missing-gateway test proves synthetic factory is not called                              | Application cutover remains Batch 5                               |
| P9B2-06 | Bound queries, sorts, pagination, and timeouts                               | Implemented    | Zod allowlists; page <=10,000; page size <=50/config cap; operation runner timeout; focused tests                                     | Keyset pagination and measured query plans remain live work       |
| P9B2-07 | Keep reference resolution tenant-scoped and fail closed                      | Implemented    | `getByPublicRef` contract/synthetic implementation; gateway authorization envelope; recursive tenant-response rejection; tests; staging RLS attack 17/17 | Narrow RPC/live row decoders remain Batch 4                       |
| P9B2-08 | Classify repository failures safely                                          | Implemented    | Constant `RepositoryError` messages; upstream/configuration value and no-log tests                                                    | Error telemetry remains Phase 12                                  |
| P9B2-09 | Preserve restricted-evidence, overlay, and private-note boundaries           | Implemented    | Restricted response guard, `overlay:read` repository checks, private-note stripping, unsafe snapshot-content rejection; staging cases 6–8 | Narrow RPC projection surface remains Batch 4                     |
| P9B2-10 | Keep production configuration and repository internals out of client modules | Implemented    | `server-only` imports; static client-boundary scan; actual rendered-view-model privacy test                                           | Browser network/RSC inspection repeats at cutover                 |
| P9B2-11 | Consume persisted Phase 4 results without recalculation                      | Implemented    | Production adapter/gateway have no generator/fixture imports; fake persisted-output pass-through test; Phase 4 regression suite       | Live DB parity remains Batch 5                                    |
| P9B2-12 | Avoid new global mutable caches                                              | Implemented    | Per-invocation provider/runner; production boundary static contract                                                                   | Existing pre-Batch-2 synthetic assessment cache remains unchanged |
| P9B2-13 | Make no external, deployment, migration, or default-runtime change           | Implemented    | No dependency/lockfile, runtime route, migration, Vercel, or external service changes                                                 | All external configuration remains approval-gated                 |
| P9B2-14 | Record live PostgreSQL gates honestly                                        | Implemented    | `PRODUCTION_DATA_FOUNDATION.md`, Phase 9 plan, and this matrix require migration/RPC/RLS/attack/parity/query-plan/rollback validation | Mandatory before production claim                                 |

## Batch 3 live-migration preparation requirements

| ID       | Requirement                                                               | Classification | Evidence                                                                                                       | Remaining limitation                                    |
| -------- | ------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| P9B3P-01 | Add canonical local Supabase CLI configuration without credentials        | Implemented    | `supabase/config.toml`; generated files reviewed; `.temp` and local environment metadata ignored               | Repository remains intentionally unlinked               |
| P9B3P-02 | Prevent accidental seed execution                                         | Implemented    | No `[db.seed]` configuration or seed file; local metadata ignored                                              | Demo/staging seed isolation remains Batch 5             |
| P9B3P-03 | Add a SELECT-only live schema verifier                                    | Implemented    | `scripts/phase-9-live-schema-verify.sql`; one CTE-backed SELECT with bounded summary output                    | Re-run required after corrective push                   |
| P9B3P-04 | Verify exact tables, FKs, lineage, indexes, RLS, policies, and privileges | Implemented    | Catalog CTEs over namespace/class/constraint/index/policy/default-ACL catalogs plus effective privilege checks | Live `api_role_privileges` failed 1/1 before corrective |
| P9B3P-05 | Verify staging contains no application rows or unexpected migration rows  | Implemented    | Exact `EXISTS` probes for all 18 tables; history expects `20260713190000` + `20260715181000`                   | Corrective version absent until approved push           |
| P9B3P-06 | Keep verifier aligned with the committed migration and non-mutating       | Implemented    | Contracts cover initial + corrective migrations; retain `acldefault` fallback; reject verifier exemptions      | Static validation cannot prove PostgreSQL execution     |
| P9B3P-07 | Make no remote, Auth, runtime, environment, deployment, or Vercel change  | Implemented    | Corrective batch is repository-only until separately approved push; no Auth/app/Vercel/deploy changes          | Corrective remote apply remains approval-gated          |
| P9B3C-01 | Remediate missing function default-ACL lockdown without weakening gates   | Implemented    | `20260715181000` applied; live verifier 12/12 including `api_role_privileges`                                  | —                                                       |

## Batch 4 authenticated read RLS preparation requirements

| ID       | Requirement                                                            | Classification | Evidence                                                                        | Remaining limitation                        |
| -------- | ---------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------- | ------------------------------------------- |
| P9B4P-01 | Bind principals via `auth.uid()` → active memberships only             | Implemented    | Helpers + policies in `20260715200000`; staging attack cases 1/3/15/16          | App Auth/session binding still pending      |
| P9B4P-02 | Authenticated SELECT-only; deny anon/PUBLIC/service_role request paths | Implemented    | Column grants/revokes; live verifier; attack cases 4/5/13/17                    | —                                           |
| P9B4P-03 | One SELECT policy per core table with tenant + role gates              | Implemented    | 18 policies; live verifier policy count; attack cases 1/2/6/7/9–12/14          | —                                           |
| P9B4P-04 | No private-note / source_reference / memberships.user_id; no writes    | Implemented    | Column-only grants + revokes; attack cases 8/10/13/17                           | RPC projection surface still deferred       |
| P9B4P-05 | Static contracts reject missing/cross-tenant/permissive/service grants | Implemented    | `phase-9-rls-policy-contract.ts` + tests; staging attack harness corroboration  | —                                           |
| P9B4P-06 | Document and execute two-tenant attack-test plan                       | Implemented    | Plan + `phase-9-rls-attack-harness.mjs`; staging 17/17; cleanup empty; verifier 12/12 | Do not leave disposable Auth users behind |
| P9B4P-07 | No Auth/runtime/env/Vercel/apply/commit/push in preparation            | Implemented    | Repository-only Batch 4 prep; later apply/attack were separately authorized     | Production cutover remains gated            |
| P9B4P-08 | Viewer cannot read unpublished research; self-only ownership defaults  | Implemented    | Publication-eligibility + self-only predicates; attack cases 9–12               | —                                           |
| P9B4P-09 | Explicit viewer table/column allowlist enforced in static contracts    | Implemented    | `VIEWER_PUBLICATION_SAFE_COLUMN_ALLOWLIST` + denied-table/policy checks; case 9 | —                                           |

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

Strictly reviewed on 2026-07-14:

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

## Batch 3 live-migration preparation evidence

Recorded on 2026-07-13:

| Check                            | Result                                                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Supabase CLI                     | Temporary pinned `npx --yes supabase@2.109.1`; generated config minimized after review; no global/package install |
| `npm run test:database`          | Pass - 2 files / 25 tests; original migration plus SELECT-only live-verifier/configuration contracts              |
| `npm run validate:database`      | Pass - 18-table migration contract plus SELECT-only live verifier                                                 |
| `npm run test:security`          | Pass - 19 files / 118 tests, including the live-verifier security contract                                        |
| Phase 4 regression               | Pass - 9 files / 56 tests; methodology and assessment validators unchanged                                        |
| Format/lint/typecheck/build      | Pass                                                                                                              |
| Secrets / clean-room             | Pass - no credential, customer-data, or source-material finding                                                   |
| Local Supabase configuration     | Local-only project namespace; PostgreSQL 17; no seed/Auth/provider config; local credential/link metadata ignored |
| Live PostgreSQL execution        | Later approved: initial `20260713190000` applied; live verifier 11/12 (`api_role_privileges` failed)              |
| Auth/runtime/deployment boundary | No Auth provider, app environment, runtime route, Vercel, deployment, or push change                              |
| Full `npm run verify`            | Pass - 48 files / 323 tests; all validators/scans and production build                                            |

## Corrective default-function-privilege evidence

Recorded on 2026-07-15:

| Check                      | Result                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live SELECT-only diagnosis | Sole violation: `default_acl` / future functions / grantee `public` / privilege `EXECUTE`; missing `pg_default_acl` row; `acldefault('f')` fallback                 |
| Security classification    | Real least-privilege defect for future functions; not a verifier exemption candidate                                                                                |
| Immediate exploitability   | None while schema `USAGE` remains revoked and no functions exist                                                                                                    |
| Corrective migration       | `supabase/migrations/20260715181000_phase9_default_function_privileges.sql` prepared; fail closed unless function default-ACL row exists without public/API execute |
| Corrective rollback        | `supabase/rollback/20260715181000_phase9_default_function_privileges.sql` restores `PUBLIC EXECUTE` defaults; destructive security regression; disposable only      |
| Verifier history contract  | Expects exactly `20260713190000` and `20260715181000`; retains `acldefault` fallback and `default_acl_violations`                                                   |
| Remote apply               | Not performed in the corrective preparation batch                                                                                                                   |

After the corrective migration is approved and applied, `supabase_migrations.schema_migrations` must contain exactly those two repository versions, application rows must remain zero, and the SELECT-only verifier must pass all 12 checks. RLS allow-policy validation, two-tenant/cross-tenant attack tests, and rollback rehearsal remain mandatory later gates.

## Deferred Phase 9 requirements

| Area                                                           | Batch                                          |
| -------------------------------------------------------------- | ---------------------------------------------- |
| Authenticated Supabase SDK transport and session binding       | 3                                              |
| Narrow RPC implementation and live row decoders                | 4                                              |
| First mutation's bounded transaction and audit contract        | Phase 10/11 batch that introduces the mutation |
| Supabase Auth, SSR sessions, invites/recovery, role resolution | 3                                              |
| Narrow API/RPC schema and live row decoders                    | Remaining Batch 4 work                         |
| Environment cutover, health/readiness, demo-seed isolation     | 5                                              |
| Local/staging migration and rollback rehearsal                 | 5                                              |
