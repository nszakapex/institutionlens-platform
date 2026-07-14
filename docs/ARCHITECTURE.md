# Architecture

## Purpose

`institutionlens-platform` is a single Next.js + TypeScript application repository for the InstitutionLens product. It is not a monorepo and not the marketing site.

## High-level shape

```text
institutionlens-platform/
  assets/institutionlens/     # Brand kit source (read-only; do not modify)
  public/brand/               # App-owned fonts + mark copies for runtime
  src/
    app/                      # App Router (RSC by default)
    application/              # Tenant-safe read services & view models
    assessment/               # Phase 4 explainable assessment engine
    authorization/            # Server-only authz context
    components/               # UI (overview/, explorer/, detail/, evidence/, methodology/)
    domain/                   # Schemas, invariants, ids
    repositories/             # Tenant-scoped contracts + synthetic implementations
    verticals/                # Vertical adapters + synthetic fixtures
    lib/                      # Env, demo tenant, navigation, security
    styles/                   # Tokens + component + research-surface CSS
  docs/                       # Plans, decisions, policies
  scripts/                    # Offline verification scanners
```

## Research surfaces

- `/` — portfolio overview (shortlist, attention, opportunity, signals)
- `/organizations` — URL-driven explorer (filter/sort/pagination)
- `/organizations/[organizationRef]` — organization detail, complete ledgers, and lineage
- `/evidence` — evidence/provenance catalog
- `/methodology` — executable methodology projection
- `/foundation` — local-demo design-system / foundation preview

UI consumes application view models only. Ranking and filtering run on the server. Repositories and assessment internals remain `server-only`.

## Phase 6 read architecture

Phase 6 adds `detail-service`, `evidence-catalog-service`, and `methodology-service` application boundaries with dedicated redacted view models. Routes obtain a server-created authorization context and render React Server Components from those view models. UI components do not access fixtures or recalculate assessment results.

Organization detail validates an opaque `OrganizationPublicRef`, authorizes organization and assessment reads, builds one tenant-scoped research model for the request, resolves the reference only inside that model, and then joins tenant-scoped evidence/provenance. The reference is a deterministic truncated SHA-256 synthetic handle; it is not authorization and does not encode tenant/name data.

The current services have no memoization or process-global cache. Authorization is evaluated on each service call, and internal identifiers remain server-only join keys. This favors isolation clarity over fixture-read efficiency.

Full lineage is:

`Source → Provenance → Evidence → Rule outcome → Capability assessment → Portfolio assessment`

The complete rule ledgers are authoritative. The detail diagram presents one representative awarded chain plus capability summaries.

## Phase 9 production data foundation

Phase 9 Batch 1 adds a versioned Supabase/Postgres schema migration under `supabase/migrations` without changing the runtime adapter. The core schema is named `institutionlens`, is not an approved Data API surface, and contains only server-side raw UUID join keys.

Every tenant-owned relationship uses a tenant-composite foreign key. All core tables have RLS enabled and forced. Batch 1 deliberately grants no API role and creates no allow policy, so database access remains closed until the separately tested Phase 9 RLS batch.

Future customer data flow is:

`authenticated request -> Next.js application service -> narrow API/RPC operation -> core RLS tables`

Only existing frozen/redacted application view models may reach UI. A later API/RPC schema must expose opaque references, never raw database IDs or private fields. Production configuration must fail closed and must never silently select synthetic repositories.

Schema, migration, rollback, and retention details are in `docs/PRODUCTION_DATA_FOUNDATION.md`. Phase 9 Batch 1 does not connect Supabase, install runtime clients, execute migrations, add authentication, or deploy.

## PostgreSQL query implications

Explorer filters map cleanly to indexed columns on `organizations` (tenant_id, type, lifecycle, tags GIN) plus assessment summary tables (status, band, confidence, freshness, coverage weights). Prefer a tenant-scoped materialized read model or denormalized summary row per organization rather than joining full ledgers for list pages.

Detail and lineage reads will need tenant-keyed indexes across public organization refs, evidence, provenance, assessment runs, ledger/evidence joins, capabilities, portfolios, and overlays. Catalog text search must index publication-safe fields separately from restricted content. Query-level projection, stable pagination, section/payload limits, RLS-aware composite joins, and measured explain plans are required before production use.

The current in-memory implementation still scans/materializes fixed synthetic arrays. Its bounded fixture behavior is not a latency, throughput, payload, or production-scale claim. Database query plans and adapter parity remain Phase 9 Batch 2/5 verification work.

## Runtime principles

- **App Router** with React Server Components by default.
- Client components only where interaction requires them.
- Server-only modules for demo tenant context, future authz, and future repositories.
- CSS variables/tokens as the canonical brand layer; avoid scattering brand decisions into utility-class soup.
- Repository interfaces will wrap a typed synthetic data layer first; PostgreSQL can replace that layer later without rewriting UI contracts.

## Data (MVP direction)

- Exactly 24 deterministic fictional financial institutions in the current synthetic fixture set.
- No PostgreSQL, Supabase, Prisma, or Drizzle in Phase 0–1.
- No real organizations, Coverage material, or external downloads.

## Auth (current)

- Explicit local-demo principal + tenant context, constructed server-side.
- Labeled non-production; fail closed if missing/invalid or if `IL_APP_MODE` is not `local-demo`.
- No fake production login page.
- Supabase Auth is the approved Phase 9 direction, but no provider integration exists in Batch 1.
- **No protected production deployment** while demo authentication is in place.

## Scoring concepts (product invariant)

Keep separate at the model and UI levels:

1. Fit score
2. Evidence confidence
3. Data freshness
4. Data completeness
5. Publication eligibility

Conceptual factor categories (not weights/thresholds):

- Organizational profile fit
- Capability alignment
- Publicly evidenced need
- Timing/change signals
- Operational compatibility

## Extraction seams

Keep `src/lib/` boundaries clear enough that workers or shared packages can be extracted later. Do not add Python in the MVP.

## Hosting (future only)

Preferred later: Vercel (Next.js) + Supabase (Postgres/Auth). Neither is connected for Phase 9 Batch 1. No analytics or telemetry.

## Phase boundary

Phases 6-8 provide read-only synthetic detail, evidence/provenance, methodology, comparison, and deterministic briefs. Phase 9 Batch 1 establishes the production database contract only. Runtime persistence, RLS allow policies, production authentication, controlled cutover, real ingestion, billing, exports, notes, and deployment remain deferred.
