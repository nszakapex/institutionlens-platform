# InstitutionLens Platform

Configurable **institutional-fit intelligence** for specialized B2B companies.

This repository is the **authenticated application foundation** only. It is a clean-room product. It is **not** the InstitutionLens marketing website, and it must not import from Coverage or any AD&Co-specific prototype.

## Current status (Phase 9 Batch 1)

- Synthetic demo product through deterministic institutional briefs (Phase 8)
- Versioned, fail-closed Supabase/Postgres schema contract (Phase 9 Batch 1)
- No real organization data
- No connected PostgreSQL/Supabase project and no runtime database adapter
- Explicit **local-demo** principal and tenant context (server-side, non-production)
- **No production deployment** while demo authentication is in place
- Brand tokens and self-hosted fonts loaded for product surfaces

See:

- [`docs/FOUNDATION_PLAN.md`](docs/FOUNDATION_PLAN.md) — product and architecture plan
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — approved architecture decisions
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — technical shape
- [`docs/PHASE_7_PLAN.md`](docs/PHASE_7_PLAN.md) / [`docs/ORGANIZATION_COMPARISON.md`](docs/ORGANIZATION_COMPARISON.md) — comparison
- [`docs/PHASE_8_PLAN.md`](docs/PHASE_8_PLAN.md) / [`docs/INSTITUTIONAL_BRIEFS.md`](docs/INSTITUTIONAL_BRIEFS.md) — briefs
- [`docs/PHASE_9_PLAN.md`](docs/PHASE_9_PLAN.md) / [`docs/PRODUCTION_DATA_FOUNDATION.md`](docs/PRODUCTION_DATA_FOUNDATION.md) — production data foundation
- [`docs/CLEAN_ROOM_POLICY.md`](docs/CLEAN_ROOM_POLICY.md) — Coverage separation rules
- [`SECURITY.md`](SECURITY.md) — security posture and reporting
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to work in this repo

## Product boundaries

**In this repository**

- Application UI and server logic for fit exploration (future phases)
- Vertical adapters with synthetic fixtures first (`financial_institutions`)
- Explainable scoring concepts: fit, confidence, freshness, completeness, publication eligibility — kept separate
- Template-based research briefs (future; deterministic, evidence-linked)

**Not in this repository**

- Public marketing site (separate repository)
- Coverage / AD&Co data, rules, catalogs, briefs, or Git history
- Real organizations or copied public records
- Telemetry / analytics SDKs
- Production auth or database-backed tenant isolation (planned later)

## Brand assets

| Path                      | Role                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `assets/institutionlens/` | **Source / reference kit (do not modify).** Full brand system, written standards, and marketing-site reference implementation. |
| `public/brand/`           | **Runtime copies** served by the app: mark SVG + self-hosted Manrope/Newsreader fonts only.                                    |

CSS variables in `src/styles/tokens.css` are the canonical brand layer for the application. When brand files change upstream, copy into `public/brand/` — do not edit the source kit in place.

- Node: see `.nvmrc` (22+) and `package.json` `engines` / `packageManager` (`npm@11.6.2`).

## Local development

Requirements: Node.js 22+ (see `.nvmrc`) and npm `11.6.2` (see `packageManager` in `package.json`).

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the branded foundation page and a visible **Synthetic demo foundation** notice.

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
npm run verify
```

Health check (after `npm run dev` or against a local production server):

```bash
curl -s http://localhost:3000/api/health
```

## Demo authentication limitations

- There is **no** production login UI.
- A server-only local-demo principal/tenant is used when `IL_APP_MODE=local-demo`.
- Missing or invalid demo context **fails closed**.
- Do **not** deploy this application to a protected production environment while demo authentication is active.
- Future direction: Supabase Auth + PostgreSQL RLS (separate architecture and security review). Until RLS exists and is tested, **do not claim** production-grade tenant isolation.

## Explicitly deferred

Runtime database adapter, real auth, RLS allow policies and attack tests, external Supabase/Vercel configuration, production deployment, real data ingestion, billing, automated retention deletion, downloadable export, AI narrative generation, and analytics.

## License / ownership

Proprietary — InstitutionLens. Do not publish secrets or customer data in this repository.
