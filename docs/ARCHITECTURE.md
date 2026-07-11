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
    components/               # UI components (server unless interaction requires client)
    lib/                      # Domain boundaries, env, demo tenant, security helpers
    styles/                   # Tokens (canonical brand layer) + global styles
  docs/                       # Plans, decisions, policies
  scripts/                    # Offline verification scanners
```

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
