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
    repositories/             # Synthetic repositories (server-only)
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

## Future PostgreSQL implications (not implemented)

Explorer filters map cleanly to indexed columns on `organizations` (tenant_id, type, lifecycle, tags GIN) plus assessment summary tables (status, band, confidence, freshness, coverage weights). Prefer a tenant-scoped materialized read model or denormalized summary row per organization rather than joining full ledgers for list pages.

Detail and lineage reads will need tenant-keyed indexes across public organization refs, evidence, provenance, assessment runs, ledger/evidence joins, capabilities, portfolios, and overlays. Catalog text search must index publication-safe fields separately from restricted content. Query-level projection, stable pagination, section/payload limits, RLS-aware composite joins, and measured explain plans are required before production use.

The current in-memory implementation scans/materializes fixed synthetic arrays. Its bounded fixture behavior is not a latency, throughput, payload, or production-scale claim.

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
- Interfaces should remain compatible with a future Supabase Auth + PostgreSQL RLS design.
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

Preferred later: Vercel (Next.js) + Supabase (Postgres/Auth). Neither is configured in this phase. No analytics or telemetry.

## Phase boundary

Phase 6 provides read-only synthetic organization detail, evidence/provenance, methodology, lineage, and private-context UI. Project Phase 7 adds read-only comparison of up to three organizations (`docs/PHASE_7_PLAN.md`, D-019). Real ingestion, database persistence/RLS, production authentication, briefs, exports, notes, and mutations remain deferred.
