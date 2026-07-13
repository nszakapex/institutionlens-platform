# Phase 7 plan — Read-only organization comparison (≤3)

**Status:** Authoritative for project Phase 7; Batch 1 implementation in progress  
**Depends on:** Phases 0–6 (assessment engine, overview/explorer, detail/evidence/methodology)  
**Does not include:** Briefs, exports, notes, mutations, database, real auth, billing, external-data collection, Vercel changes, deployment

## Roadmap numbering resolution

The foundation roadmap in `docs/FOUNDATION_PLAN.md` used a different phase numbering than the executed project plans:

| Foundation plan label                                | Delivered as           | Notes                                                         |
| ---------------------------------------------------- | ---------------------- | ------------------------------------------------------------- |
| Foundation Phase 7 — Scoring engine & explainability | **Project Phase 4**    | Deterministic assessment engine, ledgers, golden fixtures     |
| Foundation Phase 8 — Core UI surfaces (read path)    | **Project Phases 5–6** | Overview/explorer (5); detail, evidence, methodology (6)      |
| Foundation Phase 9 — Comparison (≤3) & briefs        | **Split**              | **Project Phase 7 = comparison only**; briefs remain deferred |

This document and `docs/DECISIONS.md` D-019 are binding for project Phase 7. Conflicting “Phase 7 has not started” language elsewhere is superseded by D-019 once Batch 1 docs land.

## Objective

Allow an authorized user to select and compare **two or three** organizations side by side using the existing redacted, explainable Phase 4 and Phase 6 read models—without recalculating scores, inventing rankings, or declaring investment recommendations.

## Product integrity

- Prioritization / research heuristic language only
- No purchase likelihood, conversion probability, deal readiness, or universal “winner”
- Differences explained as observed contrasts under publication and evidence constraints
- Synthetic dataset and local-demo auth context only

## Architecture

```text
src/application/
  compare-query.ts           # Canonical URL ↔ CompareQuery (opaque refs only)
  compare-view-models.ts     # Redacted comparison page / column contracts
  compare-service.ts         # Authz → resolve refs → bounded compare read model
src/components/compare/
  ComparePage.tsx            # Read-only comparison UI + selection affordances
src/app/(app)/compare/
  page.tsx                   # Activated product route (noindex)
  loading.tsx / error.tsx    # Safe boundaries
```

Rules:

- Accept only `OrganizationPublicRef` values in URLs and client-facing state
- Resolve public refs **server-side after** `organization:read` and `assessment:read`
- Build **one** bounded comparison read model per request (no global cache; no reused authz decisions)
- Reuse Phase 4 assessment outputs and Phase 6 projections; **do not** recalculate fit, change weights, or alter methodology
- Restricted evidence and overlays remain permission-gated
- `comparison:create` remains a **future** mutation action for saved comparisons—unused in Phase 7

## Canonical URL

| Form                                        | Meaning                       |
| ------------------------------------------- | ----------------------------- |
| `/compare`                                  | Empty selection               |
| `/compare?org=<oref>&org=<oref>`            | Two-organization comparison   |
| `/compare?org=<oref>&org=<oref>&org=<oref>` | Three-organization comparison |

- Repeated `org` params preserve order of first occurrence
- Duplicates are dropped (first wins)
- More than three distinct refs → fail closed (`malformed`)
- One distinct valid ref → `partial` (prompt to add another)
- Zero refs → `empty`

## Required comparison content (full phase)

When `ready` (2–3 resolved organizations), show side-by-side:

1. Organization identity and profile summary
2. Assessment state
3. Portfolio / institutional summary already available in read models
4. Five capability results
5. Fit, confidence, freshness, completeness where publication policy permits
6. Evidence coverage
7. Gaps and insufficient-evidence states
8. Overlay information only with `overlay:read`
9. Clear difference explanations without recommending investment or declaring a winner

## Routes and navigation

| Surface                                   | Phase 7 role                         |
| ----------------------------------------- | ------------------------------------ |
| `/compare`                                | Activated comparison                 |
| `/` Overview                              | Links into Compare where appropriate |
| `/organizations` Explorer                 | Links into Compare where appropriate |
| `/organizations/[organizationRef]` Detail | Links into Compare where appropriate |
| `/briefs`, exports, notes                 | Explicitly deferred                  |

## Acceptance criteria

1. Exactly two or three organizations compare; other counts handled as empty/partial/malformed
2. URLs and client state contain only opaque public refs
3. Unauthorized, invalid, duplicate, and nonexistent refs fail closed without leaking raw IDs
4. No Phase 4 score/methodology/partition changes
5. No raw organization, evidence, provenance, or capability IDs in HTML, RSC payloads, URLs, or client state
6. Restricted evidence / overlays remain gated; no private notes
7. Route + header noindex / nofollow / noarchive preserved
8. Accessible selection/removal; keyboard usable; 200% zoom usable
9. Responsive at 320, 375, 768, 1024, 1440, 1920
10. Loading, empty, partial, error, not-found/malformed states present

## Test matrix

| Area            | Coverage                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------- |
| Query           | Parse/serialize; order; dedupe; >3 reject; invalid token reject                             |
| Authz           | Missing `organization:read` or `assessment:read` → unauthorized                             |
| Resolution      | Unknown ref → not_found/partial slot handling; cross-tenant impossible via demo model       |
| Privacy         | Serialized view has no `org_syn_`, `ev_syn_`, `cap_syn_`, `prov_syn_`, tenant/principal IDs |
| Publication     | Fit/dimensions withheld or labeled per existing publication policy helpers                  |
| UI states       | empty, partial, ready, unauthorized, malformed, error                                       |
| Navigation      | Overview/Explorer/Detail → Compare preserves refs                                           |
| A11y / viewport | Keyboard, skip-link, six widths, 200% zoom (later batch / verification)                     |
| Regression      | Full `npm run verify` before Phase 7 close; Phase 4 validators unchanged                    |

## Non-goals

- Ranking leaderboard or automatic recommendation
- New scoring formulas, weights, or Phase 4 methodology edits
- Briefs, exports, notes, mutations, persistent saved comparisons
- Database, private-data ingestion, production authentication
- AI-generated assessment or narrative
- Vercel configuration or deployment
- Merging or using `preview/phase-6-verification`

## Implementation batches

### Batch 1 — Contracts, query, fail-closed service, route activation

**Exact outcome:** Canonical compare query; redacted view-model types; per-request service with empty/partial/ready/unauthorized/malformed/error; `/compare` leaves placeholder and renders a minimal selection shell; nav Compare marked available. `ComparePage` remains a Server Component and consumes only precomputed hrefs from the view model (no imports of server-only compare-query / public-ref modules).

**Areas:** `compare-query.ts`, `compare-view-models.ts`, `compare-service.ts`, tests, `compare/page.tsx`, minimal `ComparePage`, `lib/navigation.ts`, server-boundary contract updates, this plan + D-019.

**Data-contract changes:** New `CompareQuery` and `ComparePageView` contracts; no Phase 4 assessment schema changes.

**Security/privacy invariants:** Authz before resolve; opaque refs only; fail closed; no raw IDs in views.

**Tests:** Query unit tests; service state/privacy tests; contract tests for product route + server-only.

**Completion criteria:** Proportionate format/lint/type/unit/privacy/build checks pass for Batch 1 scope.

**Suggested commit:** `feat: add Phase 7 compare contracts and activate /compare shell`

### Batch 2 — Full column projections

**Exact outcome:** Side-by-side projections for profile, assessment state, portfolio summary, five capabilities, publication-gated dimensions, evidence coverage, gaps/insufficient states, overlay gated section, difference explanations (non-recommending).

**Areas:** `compare-service.ts` expansion; optional shared projectors with detail; view-model fields.

**Data-contract changes:** Expand column view models only.

**Security/privacy invariants:** Same as Batch 1; overlay requires `overlay:read`; restricted evidence never expanded beyond existing rules.

**Tests:** Service projection + privacy serialization; insufficient-evidence labeling; no score mutation invariants.

**Completion criteria:** Ready comparisons expose required fields without Phase 4 changes.

**Suggested commit:** `feat: project Phase 7 compare columns from existing read models`

### Batch 3 — Comparison UI and selection controls

**Exact outcome:** Accessible side-by-side UI; add/remove organizations; URL updates with opaque refs only; responsive six widths; 200% zoom; keyboard paths.

**Areas:** `src/components/compare/*`, compare CSS, loading/error boundaries.

**Data-contract changes:** None (consume Batch 2 views).

**Security/privacy invariants:** Client components remain free of server domain imports; no raw IDs in DOM.

**Tests:** Component/contract tests; route-boundary metadata/loading/error; privacy HTML scans where applicable.

**Completion criteria:** Ready/empty/partial/error states usable without mouse-only traps.

**Suggested commit:** `feat: render accessible Phase 7 comparison UI`

### Batch 4 — Cross-surface navigation

**Exact outcome:** Overview, Explorer, and organization detail offer safe Compare entry points that preserve/extend opaque ref selections (cap at three).

**Areas:** overview/explorer/detail components and href helpers.

**Data-contract changes:** Optional `compareHref` helpers only.

**Security/privacy invariants:** Hrefs contain only `oref_` values.

**Tests:** Href builder unit tests; no internal ID leakage.

**Completion criteria:** Analyst can open Compare from the three surfaces without raw IDs.

**Suggested commit:** `feat: link Overview, Explorer, and detail into Compare`

### Batch 5 — Docs, traceability, full verification

**Exact outcome:** `ORGANIZATION_COMPARISON.md` (or equivalent), requirements traceability, architecture touch-up, full `npm run verify`, offline validators green; stop before commit/push unless requested.

**Areas:** `docs/*`, validators if needed.

**Data-contract changes:** None.

**Security/privacy invariants:** Document fail-closed and non-goals explicitly.

**Tests:** Full verify suite.

**Completion criteria:** Traceability complete; Phase 7 acceptance checklist evidenced.

**Suggested commit:** `docs: record Phase 7 comparison surfaces and traceability`

## Dependencies that must exist (satisfied)

- Phase 4 synthetic assessments and ledgers
- Phase 5 overview/explorer
- Phase 6 `OrganizationPublicRef`, detail/evidence/methodology services, redaction patterns

## Explicitly deferred beyond Phase 7

Briefs, exports, notes, mutations, saved comparisons, database/RLS, real authentication, billing, external-data collection, AI narratives, ranking leaderboards, automatic recommendations, Vercel/deploy work.

## Boundary after Phase 7

Phase 7 is a **read-only synthetic comparison** of two or three organizations. It does not claim production isolation, predictive performance, or publication readiness beyond existing synthetic demo controls.
