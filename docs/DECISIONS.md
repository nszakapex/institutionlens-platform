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

## Phase boundary recorded before Phase 5

**Completed:** Phase 0, Phase 1, Phase 2, Phase 3, and Phase 4.  
**In progress:** Phase 5 — portfolio overview and organization explorer.  
**Do not proceed to Phase 6** until Phase 5 is approved and committed.

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

## D-016 — Phase 4 explainable assessment engine

**Status:** Approved for implementation

- Generic typed predicate engine; vertical-owned synthetic rule sets only under adapters
- Capability fit, portfolio priority, confidence, freshness, assessment completeness, publication eligibility, and opportunity context remain separate dimensions
- Tenant-private overlays never alter fit points; opportunity context is overlay-derived and internal-only
- Integer point scores with declared maxima; missing/stale evidence does not shrink the denominator
- Deterministic manifests and fingerprints; injected clock only
- Organization-level completeness remains `unknown`; evidence-state coverage keeps its Phase 3 name
- No eval/dynamic code, ML/LLM scoring, DB, real auth, real client data, or Phase 5 UI
- No dependency or lockfile changes; Node 22 remains canonical
- Delivery model (managed / dedicated / hybrid) remains undecided; hybrid recommended; engine stays deployment-neutral

## D-017 — Phase 5 portfolio overview & explorer

**Status:** Approved for implementation

- Functional overview at `/`; explorer at `/organizations`; foundation preview at `/foundation`
- Tenant-safe read services; UI never accesses fixtures or recalculates scores
- Prioritization/attention policies define ordering and bounds only — no new fit thresholds
- URL-canonical explorer query with Zod validation; GET forms; default hide excluded
- Insufficient evidence never treated as limited alignment or zero score
- No org detail, briefs, exports, DB, real auth, or Phase 6
- No dependency or lockfile changes

## D-018 — Phase 6 organization detail, evidence, and methodology

**Status:** Implemented in the current working tree; approval/commit status is separate

- Read-only organization detail at `/organizations/[organizationRef]`, evidence/provenance catalog at `/evidence`, and executable methodology presentation at `/methodology`
- `OrganizationPublicRef` is an opaque deterministic synthetic SHA-256 truncation used for routes; it is not authorization, carries no tenant/name meaning, and resolves only inside the active tenant
- Detail reads require organization and assessment permissions and build a bounded tenant read model per request without global caching or authorization-decision reuse
- Evidence, provenance, rule, capability, and portfolio lineage is projected through redacted server-only view models; complete ledgers remain authoritative
- Restricted evidence requires `evidence:restricted_read`; analysts and reviewers receive placeholders, while administrators may receive safe restricted fields
- Tenant-private overlay projection requires `overlay:read`; overlay data remains separate from and invariant to fit
- Methodology UI derives from executable declarations; offline validators detect manifest/rule and rule/UI structural drift
- Generic noindex metadata and response privacy/security headers are defense in depth, not substitutes for authentication or authorization
- PostgreSQL, RLS, real ingestion, production auth, comparison, briefs, exports, notes, mutations, and production performance validation remain deferred
- No production isolation, scale, availability, or predictive-performance claim

## D-019 — Phase 7 read-only organization comparison (≤3)

**Status:** Delivered (project Phase 7 complete for synthetic local-demo scope)

### Roadmap numbering

- Foundation Phase 7 (scoring engine & explainability) was delivered as **project Phase 4**
- Foundation Phase 8 (core read UI) was delivered through **project Phases 5–6**
- Project Phase 7 implements **only the comparison portion** of Foundation Phase 9; briefs remain deferred

### Product decision

- Activate `/compare` for **exactly two or three** organizations from the existing synthetic dataset
- Canonical shareable URL uses repeated `org` search params containing only opaque `OrganizationPublicRef` values
- Resolve refs server-side after `organization:read` and `assessment:read` on every request
- Build one bounded comparison read model per request; reuse Phase 4/6 outputs without recalculation
- Explain differences without ranking leaderboards, automatic recommendations, or investment “winners”
- Overlay content requires `overlay:read`; restricted evidence remains gated; no private notes
- Overview shortlist, Explorer results, and organization detail offer inbound Compare links via shared `compareHrefFor`
- Attention and evidence-review queues intentionally omit Compare actions
- `comparison:create` stays reserved for future saved comparisons and is unused in Phase 7

### Explicit non-goals

Briefs, exports, notes, mutations, persistent saved comparisons, database, private-data ingestion, production authentication, billing, external-data collection, AI-generated assessments/narratives, Phase 4 methodology/score changes, Vercel configuration, and deployment

### Binding plan

See `docs/PHASE_7_PLAN.md`, `docs/ORGANIZATION_COMPARISON.md`, and `docs/PHASE_7_REQUIREMENTS_TRACEABILITY.md`.

## D-020 — Phase 8 deterministic institutional briefs

**Status:** Delivered (project Phase 8 complete for synthetic local-demo scope)

### Roadmap numbering

- Foundation Phase 9 (comparison ≤3 & briefs) was split: comparison delivered as **project Phase 7**; briefs delivered as **project Phase 8**
- Foundation draft/approve/export workflow remains **deferred** beyond Phase 8

### Product decision

- Activate `/briefs` and `/briefs/[briefRef]` for synthetic, read-only, template-generated institutional briefs
- One brief summarizes one organization for research/outreach preparation—not investment advice
- Generate only from existing authorized, redacted research/assessment read models
- Use fixed, reviewable language templates; stable section order; stable output for identical inputs
- Canonical individual route uses opaque deterministic `BriefPublicRef` (`bref_…`) derived from **tenant id + organization id**; directory may use opaque `OrganizationPublicRef` query params
- Require `brief:read` plus `organization:read` and `assessment:read` on every request, with reassertion before final projection
- Local-demo `getDemoAuthorizationContext()` grants `brief:read` alongside existing research read actions (still excludes draft/approve/export mutations)
- `brief:draft`, `brief:approve`, and `export:request` remain unused (no mutable approval or download pipeline in Phase 8)
- Restricted evidence / overlay gating and no-private-notes rules match Phases 6–7
- No Phase 4 methodology or score recalculation; no free-form LLM narrative
- Inbound Brief actions from Overview, Explorer, detail, and Compare use shared `inboundBriefActionFor` only
- Print CSS is presentation-only — not a product export feature

### Explicit non-goals

Database/Supabase/RLS, production authentication, billing, real customer data, scraping, AI narrative, mutations/comments, email, PDF/Word export, public sharing, Phase 4 changes, Vercel configuration/deployment, reconnecting Vercel Git

### Binding plan

See `docs/PHASE_8_PLAN.md`, `docs/INSTITUTIONAL_BRIEFS.md`, and `docs/PHASE_8_REQUIREMENTS_TRACEABILITY.md`.

## D-021 - Phase 9 production data and authentication foundation

**Status:** Approved for Phase 9 implementation; external infrastructure remains approval-gated

- Supabase Postgres and Supabase Auth are the production foundation.
- The current single-repository Next.js architecture remains in place.
- Synthetic repositories and fixtures remain explicit offline test/local-demo adapters.
- Production mode must fail closed when database or authentication configuration is missing; it must never fall back to synthetic data.
- Supabase client, SSR, and CLI dependencies are pinned only in the batch that uses them after current compatibility review.
- No external Supabase project, paid resource, remote migration, real data, or deployment is allowed without owner approval.

## D-022 - Core database schema and access boundary

**Status:** Approved for Phase 9 Batch 1 architecture; Batch 4 authenticated read RLS applied on staging and attack-tested

- Store core application tables in a dedicated `institutionlens` schema, not in the default public Data API surface.
- Use raw UUIDs only for server-side database joins. Use tenant-scoped opaque references at presentation and audit boundaries.
- Put `tenant_id` on every tenant-owned table and use tenant-composite foreign keys for tenant-owned relationships.
- Enable and force RLS on every core table from the initial migration.
- Batch 1 revokes `anon`, `authenticated`, and `service_role` access and defines no allow policies. This is intentionally fail closed.
- Batch 4 read RLS binds `auth.uid()` to active `memberships.user_id` only; tenant identity must not come from client input or mutable JWT metadata.
- Batch 4 introduces a separate narrow `institutionlens_api` read RPC schema. It must omit raw UUID PKs and private fields, use authenticated-only EXECUTE, remain SECURITY INVOKER under core RLS, and never accept client tenant IDs.
- Every public read RPC must take a server-bound `p_tenant_public_ref`, verify it against `accessible_tenant_ids()`, and project that discriminator for decoder validation. Decoders stamp domain `tenantId` only after the wire ref matches the session binding, then strip the wire discriminator.
- Partial RPC coverage must fail closed (`UNSUPPORTED_OPERATION`) with no production-to-synthetic fallback.
- Customer reads use authenticated membership identity. Privileged ingestion/maintenance paths remain server-only, bounded, authorized, and audited.
- Restricted evidence carries a direct access classification, and restricted content is excluded from publication-safe search.
- Overlay private notes, provenance private notes, and source references never enter application view models, search, exports, logs, or client state.

## D-023 - Database migration, rollback, and retention posture

**Status:** Approved as implementation posture; retention values remain proposed defaults; corrective default-privilege forward fix prepared

- Version forward SQL migrations under `supabase/migrations` and verify them on a clean local stack before any remote application.
- Use expand/migrate/contract changes once non-disposable data exists. Prefer forward fixes over destructive down migrations.
- If an applied migration’s intended default-privilege revoke does not materialize, add a later fail-closed forward migration; do not weaken the live verifier’s `acldefault` fallback.
- The initial schema rollback script is destructive and permitted only on approved disposable local/staging databases.
- Remote rollback requires a verified backup or point-in-time recovery plan, migration-state capture, and full security/regression verification before reopening writes.
- Preserve D-009 proposed defaults: draft briefs 30 days, approved internal briefs 90 days, audit/security events 180 days, exports 7 days, and temporary files deleted after completion.
- Propose tenant-scoped research data for active-contract lifetime plus a 30-day deletion grace; this requires legal/customer approval.
- Retention expiry columns do not authorize automated deletion. No purge job is implemented in Phase 9 Batch 1.
- See `docs/PRODUCTION_DATA_FOUNDATION.md` for the schema, migration, rollback, and retention controls.

## D-025 - Authenticated read-only RLS enablement

**Status:** Approved; applied on staging; disposable Auth/fixture attack-test gate 17/17 passed and cleaned

- Grant `authenticated` only `USAGE` on `institutionlens` plus **explicit column** `SELECT` grants. Never use table-level `SELECT` (it would override column withholdings).
- Withhold `private_notes`, provenance `source_reference`, and `memberships.user_id` from `authenticated` (grant omit + revoke).
- Keep `anon`, `PUBLIC`, and `service_role` without InstitutionLens request-path privileges.
- Create exactly one `FOR SELECT TO authenticated` policy per core table; create no write policies.
- Map membership roles as: `owner` (restricted + overlay + audit), `analyst` (overlay, no restricted), `viewer` (publication-eligible rows only; no provenance/overlays).
- Default user-owned rows to self-only (`memberships`, saved comparisons, own brief drafts).
- Use narrow `SECURITY DEFINER` membership helpers with pinned `search_path`; do not use `USING (true)`, client tenant IDs, or broad definer bypasses.
- Isolation proven on staging via `scripts/phase-9-rls-attack-harness.mjs` against `docs/PHASE_9_RLS_ATTACK_TEST_PLAN.md` (17/17); residual fixtures must remain empty.
- See `docs/PHASE_9_BATCH_4_POLICY_MODEL.md` and `docs/PHASE_9_RLS_ATTACK_TEST_PLAN.md`.

## D-024 - Production repository and configuration boundary

**Status:** Approved for Phase 9 Batch 2 structure; live transport and cutover remain deferred

- Keep existing domain repository interfaces as the read contract and compose them into one server-only repository bundle.
- Construct repository bundles per request; do not add a process-global repository, authorization decision, or tenant-data cache.
- Keep `local-demo` explicit. Production-like modes require validated server-only configuration and an injected authenticated Supabase/Postgres gateway and must never fall back to synthetic data.
- Use a server-only publishable-key configuration for the future authenticated user gateway. Do not admit privileged Supabase credentials or direct database connection strings into user-request configuration.
- Enforce bounded pages/page sizes, resource-specific sort allowlists, timeouts, tenant-response checks, frozen outputs, and constant safe error messages at the repository boundary.
- Read persisted Phase 4 results; do not implement a second assessment calculator in the database adapter.
- Reassert `evidence:restricted_read` and `overlay:read`; remove private note fields and reject unsafe brief snapshot content before application projection.
- The typed gateway is an offline seam only. Narrow org/evidence/comparison/brief RPCs and live-row decoders are prepared; a Supabase client/SSR package, authenticated session binding, RPC apply/transport, remaining domain RPCs, query plans, and PostgreSQL parity remain mandatory later work.
- No write method is introduced while the application is read-only. The first write repository must use an explicit bounded transaction with audit and lineage updates.

## Current phase boundary

Phases 0-8 are complete for synthetic local-demo scope. Phase 9 Batches 1-2 establish fail-closed production database and repository contracts only. Runtime persistence, RLS allow policies, production authentication, external infrastructure, real data, billing, and hosting remain deferred.
