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
    components/               # UI (overview/, explorer/, shell/, status/)
    domain/                   # Schemas, invariants, ids
    repositories/             # Synthetic repositories (server-only)
    verticals/                # Vertical adapters + synthetic fixtures
    lib/                      # Env, demo tenant, navigation, security
    styles/                   # Tokens + component + overview/explorer CSS
  docs/                       # Plans, decisions, policies
  scripts/                    # Offline verification scanners
```

## Phase 5 research surfaces

- `/` — portfolio overview (shortlist, attention, opportunity, signals)
- `/organizations` — URL-driven explorer (filter/sort/pagination)
- `/foundation` — local-demo design-system / foundation preview

UI consumes application view models only. Ranking and filtering run on the server. Repositories and assessment internals remain `server-only`.

## Future PostgreSQL implications (not implemented)

Explorer filters map cleanly to indexed columns on `organizations` (tenant_id, type, lifecycle, tags GIN) plus assessment summary tables (status, band, confidence, freshness, coverage weights). Prefer a tenant-scoped materialized read model or denormalized summary row per organization rather than joining full ledgers for list pages.

## Runtime principles

- **App Router** with React Server Components by default.
- Client components only where interaction requires them.
- Server-only modules for demo tenant context, future authz, and future repositories.
- CSS variables/tokens as the canonical brand layer; avoid scattering brand decisions into utility-class soup.
- Repository interfaces will wrap a typed synthetic data layer first; PostgreSQL can replace that layer later without rewriting UI contracts.

## Data (MVP direction)

- Deterministic synthetic organizations only (~24 fictional financial institutions in a later phase).
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
