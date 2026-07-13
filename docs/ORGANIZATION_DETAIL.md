# Organization detail

**Phase:** 6  
**Route:** `/organizations/[organizationRef]`  
**Data status:** deterministic synthetic demo only

## Purpose and boundary

The organization-detail surface connects an organization profile to its conditional portfolio assessment, capability assessments, complete rule ledgers, evidence, provenance, change signals, limitations, tenant-private context, and assessment manifest. It is a read-only research surface. It does not implement comparison, briefs, exports, notes, mutations, real ingestion, a database, or production authentication.

Phase 6 ends at these read surfaces. Phase 7 has not started.

## Public route references

`OrganizationPublicRef` is an opaque route handle, not an authorization credential.

- `organizationPublicRefFor` hashes `il:organization-public-ref:v1:<internal organization id>` with SHA-256, keeps the first 20 lowercase hexadecimal characters, and prefixes `oref_`.
- Generation is deterministic for the current synthetic fixture set.
- The value is not derived from a tenant ID, display name, regulatory identifier, or other user-facing field.
- The schema accepts `oref_` plus 16–32 lowercase hexadecimal characters so a future generator can retain the route contract.
- A valid reference proves only that a string has the expected shape. Every resolution still requires an active `AuthorizationContext`, `organization:read`, `assessment:read`, and a lookup within `context.tenant.id`.
- Cross-tenant or unknown references resolve to the same not-found state.

Current evidence: `src/domain/organization-public-ref.ts:1-55`, `src/domain/organization-public-ref.test.ts:10-48`, and `src/application/detail-service.ts:681-715`.

### Future database compatibility and collisions

A database-backed implementation should store an immutable, unique `public_ref` rather than recomputing it during every request. It may preserve existing synthetic refs or issue database-generated refs that satisfy the same schema. Before insert, enforce a unique constraint and retry generation on collision. Migration must maintain an old-to-new alias or redirect map if issued URLs change. Because the current digest is truncated, uniqueness across 24 fixtures is a test result, not a proof of global collision freedom.

## Request flow

1. The route obtains the server-created demo authorization context.
2. The service validates the route reference.
3. It checks `organization:read` and `assessment:read`.
4. `getTenantResearchReadModel` builds one tenant-scoped normalized research model for that request.
5. The service resolves the organization only inside that model, then joins tenant-scoped evidence and provenance.
6. It produces and deep-freezes a redacted `OrganizationDetailPageView`.
7. The React Server Component renders only that view model.

There is no request memoization or process-global cache. Authorization decisions and view models are not reused across requests. Internal organization, evidence, provenance, assessment, overlay, tenant, principal, ledger, and rule identifiers remain server-only join keys and are omitted from the client-facing view.

The read is bounded by the fixed synthetic dataset and caps signals at 12. It still scans/builds much of the in-memory tenant model and therefore is not evidence of production query performance.

## Page states

| State          | Meaning                                                |
| -------------- | ------------------------------------------------------ |
| `ok`           | Authorized, tenant-scoped record built                 |
| `malformed`    | Route reference failed schema validation               |
| `not_found`    | No record in the active tenant                         |
| `unauthorized` | Required permission or active-context check failed     |
| `unavailable`  | Adapter or methodology version is unsupported          |
| `error`        | Safe generic failure; runtime details are not rendered |

Malformed and not-found routes use the route-level not-found boundary. Generic metadata does not include an organization name.

## Detail sections

- Synthetic profile and vertical facts
- Conditional portfolio result, assessed coverage, confidence, freshness, completeness, and publication eligibility
- Five capability sections with complete rule ledgers and factor contributions
- Evidence cards and visible provenance records
- One representative full lineage chain plus capability-level lineage summaries
- At most 12 change signals, explicitly described as observations rather than predictions
- Evidence and provenance gaps
- Tenant-private overlay, when permitted and present
- Version manifest and a 12-character preview of a composite SHA-256 fingerprint; the preview is not a signature

Insufficient evidence never receives a numeric score or observed-alignment band. Missing capability weight is not treated as negative fit.

## Permissions

| Permission                 | Analyst | Reviewer | Administrator | Detail effect                               |
| -------------------------- | ------: | -------: | ------------: | ------------------------------------------- |
| `organization:read`        |     Yes |      Yes |           Yes | Required for the page                       |
| `assessment:read`          |     Yes |      Yes |           Yes | Required for assessment data                |
| `evidence:read`            |     Yes |      Yes |           Yes | Enables evidence and provenance sections    |
| `evidence:restricted_read` |      No |       No |           Yes | Reveals approved restricted-evidence detail |
| `methodology:read`         |     Yes |      Yes |           Yes | Enables the separate methodology route      |
| `overlay:read`             |     Yes |      Yes |           Yes | Enables safe private-context fields         |

The effective check requires both the permission in the context and the role allowlist. An analyst may read the safe overlay but cannot read restricted evidence.

## Privacy and indexing controls

The route uses generic metadata with `index: false`, `follow: false`, and `noarchive: true`. The root metadata and response security headers add broader noindex and privacy controls. These controls reduce accidental indexing and referrer disclosure; they do not authenticate a user, authorize a tenant, prevent a direct request, or replace database row security.

## Future PostgreSQL needs

A database implementation should use a single transaction or stable snapshot and tenant predicates on every relation. Expected access paths include:

- unique `organizations(public_ref)` plus tenant-aware lookup, preferably `UNIQUE (tenant_id, public_ref)`;
- `evidence(tenant_id, organization_id, publication_eligibility, title)`;
- `provenance(tenant_id, id)`;
- assessment and ledger indexes by tenant, organization, methodology version, capability, and rule;
- overlay uniqueness by tenant and organization;
- change-signal ordering by tenant, organization, evidence type, and effective/observed date.

Payload size grows with every ledger row and evidence card. A local optimized production build measured:

- fully assessed sample: 137,096-byte initial HTML; 16,454-byte encoded / 67,959-byte decoded primary RSC response on client navigation;
- insufficient-evidence sample: 127,905-byte initial HTML; 16,001-byte encoded / 62,455-byte decoded primary RSC response on client navigation.

These are single-machine fixture measurements, not budgets or production-performance evidence. Production work must introduce query-level projection, measured limits, cursor pagination or section loading, payload budgets, and query-plan tests. The current implementation provides no database, latency, throughput, or scale claim.

## Verification

- `src/application/detail-service.test.ts`
- `src/domain/organization-public-ref.test.ts`
- `scripts/validate-lineage-ui.ts`
- `src/app/(app)/route-boundary.contract.test.ts`
