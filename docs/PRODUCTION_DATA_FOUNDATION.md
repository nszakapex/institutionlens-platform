# Production data foundation

**Phase:** Project Phase 9

**Status:** Staging schema foundation linked/applied for `20260713190000`; corrective default-function-privilege migration prepared and unapplied; application runtime still synthetic local-demo

**Migrations:**

- `supabase/migrations/20260713190000_phase9_initial_schema.sql` (applied on approved staging)
- `supabase/migrations/20260715181000_phase9_default_function_privileges.sql` (prepared; not applied)

## Architecture

Supabase provides managed PostgreSQL and Auth. InstitutionLens keeps the Next.js server as the presentation and application boundary.

```text
Browser
  -> Next.js authenticated Server Components / route handlers
    -> per-request Supabase user session
      -> narrow API/RPC operations (Phase 9 Batch 4)
        -> institutionlens core schema + RLS
```

The `institutionlens` schema is not exposed through the Data API in Batch 1. Core tables contain raw UUID join keys and private fields. Future browser-visible and RSC-visible models must continue to use the existing frozen, redacted application view models and opaque references.

Batch 4 may add a separate exposed API schema containing narrowly granted operations. Callers may receive only opaque references and publication-safe projections. Core-table grants alone do not make the core schema an approved Data API surface.

Customer reads use the authenticated user's identity and membership. Controlled ingestion or maintenance may use a backend-only privileged path, but each operation must have an explicit authorization policy, bounded input, audit event, and server-only credential. A privileged key is never a substitute for RLS tests and is never shipped to the browser.

## Repository boundary

Batch 2 defines a server-only `RepositoryBundle` for the data the application already reads:

- current workspace/tenant context;
- organizations plus tenant-scoped opaque-reference resolution;
- organization evidence and provenance;
- persisted capability and portfolio assessments, manifests, complete rule ledgers, and opportunity context;
- capability portfolios and tenant-private overlays;
- saved comparison records and brief snapshot records where persistence exists.

The existing synthetic organization, assessment, portfolio, and overlay repositories remain the local-demo implementations. New synthetic workspace/saved-record implementations use the same contracts; saved comparisons and brief snapshots are empty because Phases 7-8 are transient/generated and do not persist them. This does not change route or application-service wiring.

The production structure is:

```text
per-request authorization context
  -> repository provider (explicit mode)
    -> production repository adapters
      -> injected authenticated Supabase/Postgres gateway
        -> narrow RLS-backed RPCs (mandatory Batch 4 work; not implemented)
```

The gateway operation map is typed and is tested with offline fakes. It is not a Supabase SDK client, SQL executor, live row decoder, or database-integration claim. Batch 3 must bind an authenticated user session; Batch 4 must implement the narrow RPC surface and RLS policies; Batch 5 must run adapter parity against PostgreSQL.

Every production adapter call reasserts the required application permission, carries tenant and principal context, enforces a request timeout, rejects a mismatched `tenantId` anywhere in a response, validates page response bounds, deep-freezes returned data, and maps unknown failures to constant safe errors without logging upstream values. The adapter never imports the assessment generator: database results are persisted Phase 4 outputs, not recalculated scores.

Restricted evidence reaching a caller without `evidence:restricted_read` is treated as an invalid gateway response. Overlay operations require `overlay:read`. Provenance and overlay note fields are removed by the production adapter, and brief snapshot content containing private-note or internal-ID field names is rejected.

No write method is reachable in Batch 2. The first write repository must define a bounded transaction that atomically applies the domain change, lineage updates, and audit event; it must not retrofit unbounded generic writes into this read gateway.

## Adapter selection and environment

`createRepositoryBundle` has no implicit mode and creates a fresh bundle per invocation. Selection rules are:

| `IL_APP_MODE`                          | Result                                                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| absent or unknown                      | Fail closed                                                                                                                                |
| `local-demo`                           | Synthetic bundle only when demo tenant/principal configuration is valid, production variables are absent, and `NODE_ENV` is not production |
| `development`, `staging`, `production` | Production adapter only when all production variables are valid and an authenticated gateway is injected; never synthetic fallback         |

Required production-like variables are server-only:

| Variable                           | Validation                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| `IL_SUPABASE_URL`                  | HTTPS origin only; no user info, path, query, or fragment; host must match the project reference |
| `IL_SUPABASE_PROJECT_REF`          | Exactly 20 lowercase alphanumeric characters                                                     |
| `IL_SUPABASE_PUBLISHABLE_KEY`      | Non-empty bounded publishable key; retained only in the server-only config object                |
| `IL_REPOSITORY_REQUEST_TIMEOUT_MS` | Optional integer 100-30,000; defaults to 5,000                                                   |
| `IL_REPOSITORY_MAX_PAGE_SIZE`      | Optional integer 1-50; defaults to 50                                                            |

`NEXT_PUBLIC_SUPABASE*` names, mixed demo/production settings, direct user-path database URLs, and privileged Supabase credentials are rejected. Errors contain stable issue codes only and never values. The publishable key and URL are not exposed to client components even though the provider may classify a publishable key as non-secret.

## Schema catalog

All application tables use UUID primary keys for internal joins. Those UUIDs must not leave repository/application boundaries. Opaque references are random or tenant-salted and unique within a tenant.

| Table                            | Purpose                                                   | Principal ownership and bounds                                                            |
| -------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `tenants`                        | Workspace lifecycle and classification                    | One row per workspace; opaque `tref_`                                                     |
| `tenant_verticals`               | Allowed vertical and adapter version                      | Unique tenant + vertical                                                                  |
| `memberships`                    | Supabase user to tenant role                              | Owner/analyst/viewer; unique tenant + user; opaque `mref_`                                |
| `organizations`                  | Generic institution record and adapter payload            | Tenant-composite identity; opaque `oref_`; idempotent source key                          |
| `import_runs`                    | Import attempt, checksum, idempotency, dry-run and status | Opaque `iref_`; bounded safe error summary; no input payload                              |
| `provenance_records`             | Source, license, access, validation and source lineage    | Tenant source key; raw source reference stays server-only                                 |
| `evidence_records`               | Evidence state, observation, quality and publication gate | Organization/provenance/import composite FKs; restricted rows have empty safe-search text |
| `evidence_dependencies`          | Calculated evidence input lineage                         | Tenant-composite evidence edges; no self-edge                                             |
| `assessment_runs`                | Immutable run inputs, versions, fingerprints and state    | Opaque `aref_`; organization scoped; manifest retained                                    |
| `assessment_results`             | Portfolio-level deterministic output                      | One result per run; separate fit/confidence/freshness/completeness/publication            |
| `capability_results`             | Capability-level output                                   | Unique run + capability reference                                                         |
| `rule_results`                   | Complete rule outcome ledger                              | Award and maximum-point invariants; no scoring rule definitions                           |
| `rule_result_evidence`           | Rule-to-evidence lineage                                  | Tenant-composite join in both directions                                                  |
| `organization_overlays`          | Tenant-private relationship and usage context             | One per tenant + organization; private notes never projected                              |
| `saved_comparisons`              | Named saved comparison                                    | Opaque `cref_`; creator membership; active/archive state                                  |
| `saved_comparison_organizations` | Ordered comparison membership                             | Unique position and organization; positions 1-3 only                                      |
| `brief_snapshots`                | Immutable deterministic brief snapshot                    | Opaque `bsref_`; content fingerprint; approval and retention fields                       |
| `audit_events`                   | Redacted security and business audit trail                | Opaque actor/target refs; bounded metadata; retention field                               |

## Tenant integrity

- Every tenant-owned child table has `tenant_id NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`.
- Every referenced tenant-owned parent has a unique `(tenant_id, id)` key.
- Domain foreign keys use `(tenant_id, referenced_id)`, preventing a UUID from another tenant from satisfying the relationship.
- Assessment hierarchy keys also carry run and organization identity, and rule/evidence edges carry organization identity. This prevents same-tenant cross-organization lineage mismatches.
- Tables that reference memberships use tenant-composite keys.
- `memberships.user_id` is the only application-schema reference to Supabase-managed `auth.users`; it references the primary key as recommended by Supabase.
- Auth-user deletion nulls `memberships.user_id` while retaining the membership tombstone for historical references. A membership without a user cannot resolve an authenticated session.
- RLS is enabled and forced on all 18 core tables (17 tenant-owned child tables plus `tenants`). Batch 1 defines no policies, so access is denied by default.

RLS is necessary but not sufficient. Application authorization, tenant filters, frozen/redacted view models, opaque refs, safe errors, and privacy tests remain mandatory.

## Roles

Production membership roles are:

| Role      | Intended authority                                                         |
| --------- | -------------------------------------------------------------------------- |
| `owner`   | Workspace and membership administration plus all licensed research actions |
| `analyst` | Research, permitted evidence/overlay reads, and licensed workspace actions |
| `viewer`  | Read-only publication-safe research access                                 |

Existing local-demo analyst/reviewer/administrator types remain unchanged in Batch 1. Batch 3 must define and test the explicit mapping or replacement without broadening a role by accident.

## Evidence privacy

Evidence stores `access_classification` directly so policy checks do not depend on joining provenance. Restricted rows must have an empty `safe_search_text`; the initial migration enforces this. Restricted content remains in server-only columns and later policies/RPCs must require `evidence:restricted_read` before reading it.

Provenance private notes and overlay private notes are stored only for controlled internal workflows. They are forbidden in application view models, exports, logs, search indexes, and audit metadata.

Verified-evidence lineage requirements span evidence and provenance rows and cannot be expressed as a static row `CHECK`. The production repository transaction must enforce them and Batch 4 integration tests must prove them under RLS.

## Assessment compatibility

The schema persists Phase 4 outputs; it does not define or change rules, partitions, weights, thresholds, or publication semantics. It retains:

- versioned run manifest and input/output fingerprints;
- separate portfolio, capability, and rule result rows;
- separate fit, confidence, freshness, completeness, and publication fields;
- complete rule-to-evidence lineage;
- explicit missing, stale, restricted, gated, disabled, and invalid outcomes.

Any adapter parity test must compare database projections to the existing synthetic golden outputs. Database values never become a second scoring implementation.

## Query and index posture

Indexes cover tenant-leading membership, organization, import, provenance, evidence, assessment, overlay, comparison, brief, and audit access paths. Publication-safe evidence text has a partial full-text index that excludes restricted rows. Tags use a separate GIN index; repository queries must also provide an explicit tenant predicate.

All list operations remain bounded and use stable tie-breakers. Batch 2 caps pages at 10,000, page size at 50 or a stricter configured maximum, text at the existing 80-character limit, and sort fields by resource allowlist. Representative data, cursor/keyset evaluation, `EXPLAIN` plans, RPC payload limits, and timeout measurement are required before production claims.

## Migration strategy

1. Write forward-only SQL under `supabase/migrations`.
2. Review migration SQL and static contracts without network access.
3. Once a Docker-compatible runtime and pinned Supabase CLI are approved, run a clean local `supabase db reset`.
4. Run schema introspection, RLS attack tests, seed isolation, adapter parity, and rollback rehearsal locally.
5. Apply only to an empty staging project after explicit approval.
6. Capture a backup and migration status before every remote change.
7. Apply with `supabase db push` only after local and staging checks pass.
8. Production migrations use expand/migrate/contract changes; destructive contract steps require a separate approved maintenance change.

The approved staging project is linked through ignored local CLI metadata only. The initial schema migration is applied; the corrective default-function-privilege migration is repository-prepared and remains unapplied until a separate owner-approved push. Application runtime wiring is unchanged.

## Default privilege invariant

For the live `institutionlens` schema owner:

- future tables/sequences must not default-grant `public`, `anon`, `authenticated`, or `service_role`;
- future functions must not default-grant `EXECUTE` to `public`, `anon`, `authenticated`, or `service_role`;
- the live verifier retains `acldefault(...)` fallback so a missing function default-ACL row still fails closed.

## Rollback strategy

Before external data exists:

- reset a disposable local stack with `supabase db reset`; or
- reset the last local migration with `supabase migration down --local --last 1` and verify migration history;
- use `supabase/rollback/20260715181000_phase9_default_function_privileges.sql` only as a security-reverting emergency operation on an explicitly approved disposable database; it reintroduces `PUBLIC EXECUTE` defaults for future functions, does not drop data, and is not a safe production rollback;
- use `supabase/rollback/20260713190000_phase9_initial_schema.sql` only for an explicitly approved disposable local/staging database wipe.

The initial rollback SQL drops the entire schema and is intentionally marked `DESTRUCTIVE`. The corrective rollback is also `DESTRUCTIVE`: a security-reverting emergency script, not a data wipe and not a safe production down migration.

After any non-disposable data exists:

- stop writes;
- preserve logs and migration status;
- prefer a forward fix for compatible defects;
- restore a verified backup or point-in-time snapshot for corrupt/destructive changes;
- reconcile migration history only after schema state is verified;
- rerun RLS, adapter parity, privacy, and Phase 4-8 regression suites before reopening writes.

Rollback is not proven until the local/staging rehearsal in Batch 5.

## Data retention policy

These are proposed defaults, not automated behavior and not legal commitments. Legal and customer approval is required before enforcement.

| Data class                                                 | Proposed default                                            | Current implementation             |
| ---------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------- |
| Synthetic demo data                                        | Rebuildable and disposable                                  | Fixture reset only                 |
| Runtime temporary files                                    | Delete after success or failure                             | No production files introduced     |
| Tenant/account configuration                               | Active contract plus proposed 30-day deletion grace         | Lifecycle fields only              |
| Organizations, provenance, evidence, overlays, assessments | Tenant lifetime plus proposed 30-day deletion grace         | Tenant cascade only; no purge job  |
| Import staging/quarantine payloads                         | Proposed 30 days                                            | Payloads are not stored in Batch 1 |
| Import reports                                             | Proposed 180 days                                           | `cleanup_after` field only         |
| Draft brief snapshots                                      | Proposed 30 days                                            | `retention_expires_at` field only  |
| Approved internal brief snapshots                          | Proposed 90 days                                            | `retention_expires_at` field only  |
| Audit/security events                                      | Proposed 180 days                                           | `retention_expires_at` field only  |
| Exports                                                    | Proposed 7 days                                             | No export storage or rows          |
| Supabase Auth sessions                                     | Provider expiry and logout policy, to be decided in Batch 3 | Not implemented                    |

No automated deletion, scheduled job, storage bucket, or backup-retention claim exists. Tenant deletion must eventually be a dry-run/report/approve operation, and backup deletion lag must be disclosed honestly.

## Current verification limit

Static schema tests verify table presence, tenant columns, composite foreign keys, RLS enable/force statements, lack of allow policies, revoked roles, bounds, and rollback labeling. Repository tests use synthetic adapters and typed gateway fakes. Neither suite parses database rows from, connects to, or executes PostgreSQL.

The mandatory live gate remains: execute the migration on a clean approved local stack; introspect constraints, indexes, privileges, and forced RLS; implement reviewed allow policies and narrow RPCs; run direct two-tenant/three-role reference and restricted-data attacks; verify adapter parity against Phase 4-8 golden outputs; inspect query plans; and rehearse the destructive disposable rollback plus the non-destructive recovery plan. No production readiness or tenant-isolation claim may precede that gate.
