# Phase 9 plan - Production data, authentication, and tenant isolation

**Status:** Batches 1-2 complete; Batch 3 live-migration preparation complete; initial + corrective + Batch 4 authenticated read RLS + narrow read API/RPC migrations applied on staging; live verifier includes `api_rpc_privileges`; staging RLS attack-test gate 17/17 passed and cleaned; Auth/session binding, SDK transport, and runtime cutover pending

**Depends on:** Phases 0-8

**Does not include:** production deployment, real customer data, ingestion, billing

Authoritative production-data design: `docs/PRODUCTION_DATA_FOUNDATION.md`

Traceability: `docs/PHASE_9_REQUIREMENTS_TRACEABILITY.md`

Binding decisions: D-021 through D-023 in `docs/DECISIONS.md`

## Objective

Replace the local-demo-only persistence and identity foundations with a production-capable Supabase Postgres and Supabase Auth design while preserving every Phase 4-8 contract:

1. every request is authorized;
2. raw identifiers remain server-side;
3. tenant boundaries fail closed;
4. restricted evidence and overlays retain separate permissions;
5. the deterministic assessment method and publication semantics do not change;
6. synthetic fixtures remain available for offline regression tests;
7. production never silently falls back to demo data.

## Current boundary

Batches 1-2 add the versioned database architecture, fail-closed initial migration, shared read repository contracts, explicit adapter selection, and an offline-testable Supabase/Postgres gateway boundary. They do not install a Supabase runtime client, connect an external project, change the default synthetic runtime, add authentication UI, add RLS allow policies, or execute SQL.

After separate owner approval, one staging/development Supabase project (`qzidcqtaabubvtycstwy`) was created, linked locally via ignored CLI metadata, and the initial schema migration `20260713190000` was applied. No credentials are stored in Git, and the application runtime remains unchanged. Batch 3 preparation added canonical local CLI configuration plus a SELECT-only live catalog verifier.

The initial migration creates an unexposed `institutionlens` schema, revokes all Data API role privileges, and enables and forces RLS without policies. Live verification after that push passed 11/12 checks: future functions still retained PostgreSQL's implicit `PUBLIC EXECUTE` default because the function default-ACL revoke did not materialize. Corrective forward migration `20260715181000_phase9_default_function_privileges.sql` reasserts owner-scoped default-privilege lockdown and fails closed unless the function default-ACL row is established without public/API execute. It is prepared in the repository and must not be treated as applied until a separate approved `db push`. A database created from these migrations remains intentionally unusable by `anon`, `authenticated`, and `service_role` until later, tested migrations grant a narrow access path.

## Official guidance review

Reviewed on 2026-07-13:

- [Supabase local development and migrations](https://supabase.com/docs/guides/local-development/overview)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase API hardening](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase user-data foreign keys](https://supabase.com/docs/guides/auth/managing-user-data)
- [Supabase server-side authentication](https://supabase.com/docs/guides/auth/server-side)
- [Supabase SSR advanced guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- [Supabase database functions](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL composite foreign-key constraints](https://www.postgresql.org/docs/17/ddl-constraints.html)

Compatibility findings:

- The repository's Node.js 22+ requirement satisfies the Supabase CLI's Node.js 20+ requirement.
- Next.js App Router is supported through `@supabase/ssr`, but that package's API is documented as unstable. Its exact pinned version and cookie integration belong to Batch 3.
- A local Supabase stack requires a Docker-compatible runtime. Docker is not installed. CLI work uses the temporary pinned `npx --yes supabase@2.109.1` invocation rather than a global installation.
- Core tables stay outside the Data API surface. A later narrow API/RPC schema may expose only redacted, tenant-safe operations.

## Batches

### Batch 1 - Production architecture and schema

- Phase plan, ADRs, schema catalog, migration strategy, rollback strategy, retention policy
- Versioned initial Supabase/Postgres migration
- Tenant-composite foreign keys, bounds, indexes, and opaque-reference constraints
- RLS enabled and forced with no allow policies
- Static migration contract tests and validator
- No runtime or external service change

### Batch 2 - Repository and adapter boundary

- Shared server-only read contracts for workspace context, organizations, evidence/provenance, assessment outputs and rule ledgers, portfolios, overlays, saved comparisons, and brief snapshots
- Existing synthetic implementations composed behind the shared bundle; persistent saved-comparison and brief-snapshot collections are empty in the current local demo
- Supabase/Postgres adapter structure behind an injected, per-request authenticated gateway; no SDK transport or live RPC exists yet
- Bounded filtering, allowlisted ordering, page/page-size limits, request timeouts, tenant-response validation, frozen outputs, and constant safe errors
- Restricted evidence and overlay permissions reasserted; private provenance/overlay notes removed at the production adapter boundary
- No write repository exists because the current application reads only; the first mutation contract must add a bounded database transaction and audit atomically
- Per-request dependencies only; no new process-global authorization or data cache
- `development`, `staging`, and `production` modes fail closed when production configuration or the gateway is absent; they never fall back to synthetic data
- `local-demo` remains explicit and is rejected by the new provider when `NODE_ENV=production`; the current application runtime remains wired to the pre-existing demo gate until controlled cutover

### Batch 3 - Real authentication and sessions

- Preparation checkpoint: minimal local Supabase config, with no seed/Auth/provider configuration or seed file and with local credential/link metadata ignored
- Preparation checkpoint: SELECT-only live catalog verifier for schema/table/index/FK/RLS/policy/privilege/empty-data/migration-history gates
- Preparation checkpoint: offline contract tests that keep the verifier aligned to the committed migration and reject mutating SQL
- Supabase Auth signup/invite, login, logout, and recovery flows
- Owner, analyst, and viewer membership resolution
- Secure SSR cookie handling, safe redirects, disabled-user handling, and rate limits
- Authenticated routes remain dynamic and non-cacheable
- Service credentials remain server-only

### Batch 4 - RLS and cross-tenant hardening

- Applied forward migration `20260715200000_phase9_authenticated_read_rls.sql` with fail-closed rollback artifact retained
- `auth.uid()` → active membership tenant binding; authenticated **column-only** SELECT grants; anon/PUBLIC/service_role remain denied
- Withheld `private_notes`, provenance `source_reference`, and `memberships.user_id`; self-only memberships/comparisons; viewer publication-eligible gates
- Static RLS policy contracts + live verifier expectations for 18 SELECT policies, withheld-column proofs, and four-migration history
- Staging attack gate: disposable Auth/fixture harness `scripts/phase-9-rls-attack-harness.mjs` executed 17/17 and cleaned to empty
- Policy model and attack plan: `docs/PHASE_9_BATCH_4_POLICY_MODEL.md`, `docs/PHASE_9_RLS_ATTACK_TEST_PLAN.md`
- Applied: narrow `institutionlens_api` read RPCs + server-only live-row decoders for organizations, evidence, comparisons, and briefs (`docs/PHASE_9_BATCH_4_API_RPC.md`)
- Narrow read API/RPC: 9 RPCs require `p_tenant_public_ref`; unsupported ops fail closed with `UNSUPPORTED_OPERATION`; live verifier 13/13 including `api_rpc_privileges`
- Remaining Batch 4 work: authenticated SDK transport; remaining read RPCs (workspace/assessments/overlays/provenance/capabilities/portfolios)

### Batch 5 - Controlled cutover

- Explicit local-demo, development, staging, and production modes
- Health and readiness checks
- Demo-seed isolation
- Local/staging migration and rollback rehearsal
- Full Phase 4-8 product regression through the database adapter
- Stop before production deployment or runtime cutover

## Batch 3 live-migration preparation acceptance criteria

1. `supabase/config.toml` is canonical local configuration only and contains no project ref, password, token, key, or connection string.
2. No seed configuration or seed file is present.
3. Supabase `.temp`, branch, dotenvx, and local environment metadata remain ignored.
4. The live verifier contains one CTE-backed `SELECT` statement and returns only check names, pass/fail state, and aggregate expected/actual summaries.
5. Expected tables, explicit indexes, tenant-composite domain foreign keys, and same-organization lineage constraints match the committed migration.
6. Live catalog checks cover RLS enable/force flags, zero policies, API-role privilege revocation, exact zero-row probes, and the single expected migration-history version.
7. Static tests reject mutation keywords; missing or extra tables, indexes, and foreign keys; lineage-column drift; permissive policy or privilege checks; nonzero application rows; missing zero-row probes; and migration-history drift.
8. No repository link, password access, remote SQL, Auth configuration, application environment, Vercel action, deployment, push, or runtime change occurs.

## Batch 2 acceptance criteria

1. All current read domains have typed server-only contracts and an explicit repository bundle.
2. Synthetic repositories satisfy those contracts without changing the application's default adapter wiring.
3. Production-like modes require consistent server-only Supabase configuration and an injected user-scoped gateway.
4. Missing, malformed, mixed, public, or privileged user-path configuration fails closed without printing values.
5. Repository queries cap pages at 10,000 and page size at 50 (or a stricter configured maximum), and accept only named sort fields.
6. Every production operation reasserts authorization, carries tenant/principal context, times out, freezes output, and rejects cross-tenant response data.
7. Production adapters consume persisted assessment results and never import or invoke Phase 4 assessment generation.
8. Restricted evidence, overlays, private notes, raw IDs, and repository configuration do not cross unauthorized or rendered boundaries.
9. No Supabase project, client SDK, privileged credential, direct database connection, migration execution, deployment, or runtime cutover is introduced.
10. Live row decoding, narrow RPC implementation, query plans, and rollback rehearsal remain mandatory later gates.

## Batch 1 acceptance criteria

1. All requested production entities have documented and migrated schemas.
2. Every tenant-owned table carries `tenant_id`, RLS is enabled and forced, and no allow policy exists.
3. Cross-table domain references include `tenant_id` in the foreign key.
4. Data API roles have no schema or table privileges.
5. Opaque references have format and tenant uniqueness constraints.
6. Restricted evidence cannot populate the publication-safe search column.
7. Saved comparison positions are limited to 1-3.
8. Audit rows use opaque actor and target references, not raw domain or principal IDs.
9. Migration, rollback, and retention limits are explicit and honest.
10. Phase 4-8 runtime and assessment sources remain unchanged.

## Verification by batch

Each batch runs format, lint, typecheck, focused tests, security/privacy tests, relevant validators, production build, and targeted browser checks when UI changes. Database execution, policy attack tests, and rollback rehearsal require the local Supabase stack in Batches 4-5.

Batch 1 verification on 2026-07-13:

- focused database contract: 1 file / 7 tests passed;
- security suite: 14 files / 75 tests passed;
- Phase 4 assessment regression: 9 files / 56 tests passed;
- full `npm run verify`: 43 files / 280 tests, all validators/scans, and production build passed;
- no browser run: Batch 1 changes no UI, routes, or runtime behavior;
- no SQL execution: Docker-compatible runtime and Supabase CLI are not installed.

Batch 2 focused verification on 2026-07-13:

- repository/configuration contracts: 6 files / 38 tests passed;
- security/privacy suite: 18 files / 100 tests passed;
- Phase 4 assessment regression: 9 files / 56 tests passed;
- full `npm run verify`: 47 files / 305 tests, all validators/scans, and the production build passed with the documented local-demo process environment;
- typecheck and lint passed;
- full verification evidence is recorded in `PHASE_9_REQUIREMENTS_TRACEABILITY.md`;
- no browser run: Batch 2 changes no UI, route output, or default runtime wiring;
- no live adapter claim: the Supabase/Postgres gateway is exercised only with typed fakes.

Batch 3 live-migration preparation, strictly reviewed on 2026-07-14:

- temporary Supabase CLI pinned to `2.109.1`; no global install or package dependency;
- generated CLI config reduced after review to the minimal local project namespace, API defaults, PostgreSQL major version, and migration settings; no seed, Auth, provider, project-reference, credential, or remote-push authorization configuration remains;
- focused database contracts: 2 files / 25 tests passed before full verification;
- `validate:database` confirms the original migration/rollback contract plus the SELECT-only live verifier;
- security/privacy suite: 19 files / 118 tests passed;
- Phase 4 assessment regression: 9 files / 56 tests plus methodology and assessment validators passed;
- format, lint, typecheck, secret/privacy scans, and production build passed;
- full `npm run verify`: 48 files / 323 tests, all validators/scans, and production build passed;
- no live execution claim: the project is not linked and the verifier has not queried PostgreSQL.

Corrective migration `20260715181000`, Batch 4 RLS migration `20260715200000`, and narrow read API/RPC migration `20260715210000` are applied on staging. History currently contains exactly those four versions. Staging RLS attack-test gate is complete (17/17 + cleanup). Live-row decoders and fail-closed partial coverage are in the repository; authenticated SDK transport remains deferred.

## Stop gates

Stop for owner approval before:

- creating any additional Supabase project or linking the repository;
- adding billable Supabase resources;
- applying migrations to a remote database;
- using real or customer data;
- reconnecting Vercel or deploying any environment.
