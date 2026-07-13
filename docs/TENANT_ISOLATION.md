# Tenant isolation

## Foundation model (Phase 3)

1. App routes and health still gate on `getDemoPrincipal()` (env-backed local-demo principal).
2. Domain reads use `AuthorizationContext` from `getDemoAuthorizationContext()`.
3. Domain tenant ID is `tenant_demo_research` — **not** taken from URL, cookies, or client state.
4. Env `IL_DEMO_TENANT_ID` validates the demo gate but is not copied into organization records.
5. Every repository method requires `AuthorizationContext` and scopes results to `context.tenant.id`.
6. Cross-tenant lookups return the same not-found result without revealing existence.

## Current Phase 6 read boundary

Phase 6 retains the foundation model and extends it to organization detail, evidence/provenance, methodology, and private overlay reads:

1. `OrganizationPublicRef` is validated as an opaque route handle but is never accepted as authorization.
2. Detail resolution requires `organization:read` and `assessment:read`, builds a tenant-scoped research model, and searches only that model.
3. Evidence catalog reads require `evidence:read`; evidence and provenance rows are filtered by `context.tenant.id`.
4. `evidence:restricted_read` is checked separately before restricted content or linked provenance is projected.
5. Methodology reads require `methodology:read`.
6. Private-context projection requires `overlay:read`.
7. The effective permission check requires both the role allowlist and the permissions carried by the context.
8. Unsupported client query parameters, including tenant-like parameters, cannot change server context or broaden results.
9. Services do not use a process-global cache or reuse authorization decisions across requests.
10. Internal tenant, principal, organization, evidence, provenance, assessment, overlay, rule, and ledger IDs are omitted from client-facing Phase 6 view models.

## Authorization actions

Read actions enforced now:

- `organization:read`
- `assessment:read`
- `evidence:read`
- `evidence:restricted_read`
- `methodology:read`
- `overlay:read`

| Permission                 | Analyst | Reviewer | Administrator |
| -------------------------- | ------: | -------: | ------------: |
| `organization:read`        |     Yes |      Yes |           Yes |
| `assessment:read`          |     Yes |      Yes |           Yes |
| `evidence:read`            |     Yes |      Yes |           Yes |
| `evidence:restricted_read` |      No |       No |           Yes |
| `methodology:read`         |     Yes |      Yes |           Yes |
| `overlay:read`             |     Yes |      Yes |           Yes |

The demo analyst receives the five non-restricted Phase 6 read permissions. An analyst can read the safe overlay projection but cannot read restricted evidence. Mutation actions remain future-facing and unused.

## Fail closed

Suspended tenant, suspended principal, missing permission, missing context, and tenant/principal mismatch all fail with safe public errors.

## Future mapping

When PostgreSQL lands, tenant_id columns and RLS policies must enforce the same boundary. Application checks remain defense in depth — not a substitute for RLS.

Public refs should be immutable and unique within the intended scope, with tenant-aware lookup. Evidence, provenance, ledger joins, assessment runs, and overlays require tenant-consistent foreign keys and RLS tests for direct, joined, aggregate, and search queries. Restricted searchable content must be separated so unauthorized text search cannot become an inference channel.

Noindex metadata, `X-Robots-Tag`, CSP, referrer policy, opaque refs, and redacted view models are privacy/security controls. None replaces authentication, authorization, tenant predicates, or future RLS.

Current isolation is application-enforced in a local demo; production-grade tenant isolation is not claimed.
