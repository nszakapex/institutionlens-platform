# Phase 9 plan - Production data, authentication, and tenant isolation

**Status:** Batch 1 complete; Batches 2-5 pending

**Depends on:** Phases 0-8

**Does not include:** external Supabase infrastructure, deployment, real customer data, ingestion, billing

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

Batch 1 adds versioned database architecture and a fail-closed initial migration. It does not install a runtime database client, connect an external project, change the synthetic runtime, add authentication UI, or add RLS allow policies.

The initial migration creates an unexposed `institutionlens` schema, revokes all Data API role privileges, and enables and forces RLS without policies. A database created from Batch 1 is intentionally unusable by `anon`, `authenticated`, and `service_role` until later, tested migrations grant a narrow access path.

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
- A local Supabase stack requires a Docker-compatible runtime. Neither Docker nor the Supabase CLI is installed on the current machine, so Batch 1 uses static SQL contract verification and does not claim migration execution.
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

- Production repository interfaces and typed row mapping
- Supabase/Postgres adapter behind current application contracts
- Bounded filtering, ordering, pagination, transactional writes, timeouts, and safe errors
- Per-request dependencies only; no process-global authorization or data cache
- `production` mode fails closed when database configuration is absent or unhealthy
- Synthetic adapters remain explicit in local-demo and test modes only

### Batch 3 - Real authentication and sessions

- Supabase Auth signup/invite, login, logout, and recovery flows
- Owner, analyst, and viewer membership resolution
- Secure SSR cookie handling, safe redirects, disabled-user handling, and rate limits
- Authenticated routes remain dynamic and non-cacheable
- Service credentials remain server-only

### Batch 4 - RLS and cross-tenant hardening

- Add reviewed RLS policies and minimal grants for every table
- Add a narrow API/RPC schema that never returns raw internal IDs
- Test two tenants and all three roles against reads, writes, joins, aggregates, searches, and foreign references
- Test restricted evidence, overlays, audits, membership changes, and disabled principals
- Verify missing access does not disclose whether restricted or overlay data exists

### Batch 5 - Controlled cutover

- Explicit local-demo, development, staging, and production modes
- Health and readiness checks
- Demo-seed isolation
- Local/staging migration and rollback rehearsal
- Full Phase 4-8 product regression through the database adapter
- Stop before external Supabase project creation or deployment

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

## Stop gates

Stop for owner approval before:

- creating or linking a Supabase project;
- adding billable Supabase resources;
- applying migrations to a remote database;
- using real or customer data;
- reconnecting Vercel or deploying any environment.
