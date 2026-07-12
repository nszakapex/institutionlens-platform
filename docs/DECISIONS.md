# Decisions

Binding architecture decisions for `institutionlens-platform`. Supersedes conflicting draft language in older plan text where noted.

## D-001 — Stack

**Status:** Approved

- Next.js + TypeScript
- Current stable Next.js release supported by chosen dependencies (pinned in lockfile)
- App Router
- Prefer React Server Components and server-side data access
- Client components only where interaction requires them
- Pin dependency versions and commit the lockfile

## D-002 — Repository structure

**Status:** Approved

- Single application repository (not a monorepo)
- npm (not pnpm, Yarn, Turborepo, or Nx)
- Boundaries clear enough for later extraction of workers/shared packages
- No Python in the MVP

## D-003 — Styling and brand

**Status:** Approved

- Use supplied InstitutionLens brand kit as visual source of truth
- Repository-owned fonts and assets under `public/brand/`
- CSS variables/tokens as canonical brand layer
- Tailwind allowed only for layout utilities if justified; do not translate the entire brand into scattered utilities
- No large component library during scaffolding
- Do not modify original kit files under `assets/institutionlens/`

## D-004 — Data strategy

**Status:** Approved

- MVP: typed, deterministic synthetic data repository in the codebase
- No PostgreSQL, Supabase, Prisma, Drizzle, or other database in current phases until approved
- Design repository interfaces so PostgreSQL can replace the synthetic repository later
- No real organizations, copied public records, Coverage material, or external downloads
- Approximately **24** synthetic financial institutions when that phase lands
- Every synthetic institution must be unmistakably fictional

## D-005 — Authentication and authorization

**Status:** Approved

- No real authentication provider yet
- Explicit local-demo principal and tenant context, server-side only
- Clearly labeled non-production
- Fail closed if demo tenant context is missing or invalid
- No fake production-ready login page
- Keep authorization interfaces compatible with future Supabase Auth + PostgreSQL RLS
- **No protected production deployment** while demo authentication is in place

## D-006 — Future auth / provider direction

**Status:** Approved (direction only)

- Preferred future: Supabase Auth + PostgreSQL RLS, subject to separate architecture and security review
- Do not configure Supabase in the current phase
- Do not claim tenant isolation is production-grade until database-enforced RLS exists and is tested

## D-007 — Hosting

**Status:** Approved (direction only)

- Preferred future: Vercel for Next.js; Supabase for PostgreSQL/Auth
- Do not configure, link, or deploy either service yet
- No analytics or telemetry

## D-008 — Briefs

**Status:** Approved

- MVP briefs: deterministic, template-based, evidence-linked
- No AI-generated or externally assisted narrative generation yet
- Briefs begin as internal drafts
- Draft, approved, and export-eligible are separate states
- Approval must not automatically make a brief publication-safe
- No automatic sending or outreach

## D-009 — Retention (documentation only)

**Status:** Approved as **proposed defaults** — require future customer/legal approval before enforcement

| Class                    | Proposed default                |
| ------------------------ | ------------------------------- |
| Synthetic demo data      | Rebuildable and disposable      |
| Runtime temporary files  | Delete after success or failure |
| Draft generated outputs  | 30 days                         |
| Approved internal briefs | 90 days                         |
| Audit/security events    | 180 days                        |
| Exports                  | 7 days                          |

Do **not** implement automated deletion yet. Label clearly as proposed defaults.

## D-010 — Exports

**Status:** Approved

- MVP export architecture may support HTML and CSV
- PDF deferred
- JSON internal/debug-only; disabled in production by default
- Every export must pass publication-safety checks
- Do **not** implement downloadable exports during the scaffold phase

## D-011 — Naming

**Status:** Approved

- Generic platform term: `Organization`
- Adapters may define user-facing labels (e.g. “Financial institution”)
- Generic domain code free of bank-, mortgage-, legal-, or AD&Co-specific terminology

## D-012 — Clean-room factor categories

**Status:** Approved (conceptual categories only — **not** weights or thresholds)

1. Organizational profile fit
2. Capability alignment
3. Publicly evidenced need
4. Timing/change signals
5. Operational compatibility

Design synthetic financial-institutions rules independently. Do not inspect or reproduce Coverage factors.

## D-013 — Documentation / Phase 0

**Status:** Approved

Phase 0 README and governance files are approved. `docs/FOUNDATION_PLAN.md` may be committed with the initial documentation/scaffold work after review.

## Phase boundary

**Completed:** Phase 0, Phase 1, and Phase 2.  
**In progress:** Phase 3 — domain foundation, tenant-safe repository, vertical adapter, synthetic dataset.  
**Do not proceed to Phase 4** until explicitly approved.

## D-014 — Phase 2 design system

**Status:** Approved for implementation

- CSS custom properties as canonical tokens (`src/styles/tokens.css`)
- Code-native SVG visual language; mark geometry preserved; no logo animation
- App shell with skip link, header, nav, mobile nav, footer, synthetic notice
- Epistemic labels and separate product-status primitives (fit / confidence / freshness / completeness / publication eligibility)
- Synthetic design-system preview only — no domain features, database, or real auth
- No new UI framework dependencies; Node 22 for any lockfile work

## D-015 — Phase 3 domain foundation

**Status:** Approved for implementation

- Generic domain schemas under `src/domain/` with schema version `1.0.0`
- AuthorizationContext derived from server-only demo gate; never from client/URL tenant IDs
- Explicit allowlisted vertical-adapter registry; no latest-version fallback for stored records
- Tenant-scoped synthetic `OrganizationRepository` with bounded query/pagination
- Exactly 24 deterministic synthetic financial institutions; fit remains unassessed
- Evidence/provenance invariants fail closed; no scoring, ranking, DB, or real auth
- No dependency or lockfile changes in this phase
