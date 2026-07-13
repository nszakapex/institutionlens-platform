# Phase 7 plan — Read-only organization comparison (≤3)

**Status:** Complete (Batches 1–5 delivered; synthetic local-demo verification closed)  
**Depends on:** Phases 0–6 (assessment engine, overview/explorer, detail/evidence/methodology)  
**Does not include:** Briefs, exports, notes, mutations, database, real auth, billing, external-data collection, Vercel changes, deployment

Authoritative surface documentation: `docs/ORGANIZATION_COMPARISON.md`  
Traceability: `docs/PHASE_7_REQUIREMENTS_TRACEABILITY.md`  
Decision: `docs/DECISIONS.md` D-019

## Roadmap numbering resolution

The foundation roadmap in `docs/FOUNDATION_PLAN.md` used a different phase numbering than the executed project plans:

| Foundation plan label                                | Delivered as           | Notes                                                         |
| ---------------------------------------------------- | ---------------------- | ------------------------------------------------------------- |
| Foundation Phase 7 — Scoring engine & explainability | **Project Phase 4**    | Deterministic assessment engine, ledgers, golden fixtures     |
| Foundation Phase 8 — Core UI surfaces (read path)    | **Project Phases 5–6** | Overview/explorer (5); detail, evidence, methodology (6)      |
| Foundation Phase 9 — Comparison (≤3) & briefs        | **Split**              | **Project Phase 7 = comparison only**; briefs remain deferred |

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
src/lib/
  compare-url.ts             # Client-safe opaque-ref format helpers
src/components/compare/
  ComparePage.tsx            # Server Component comparison UI
  CompareSelectionForm.tsx   # Narrow client selection island
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

## Delivered comparison content

When `ready` (2–3 resolved organizations), show side-by-side:

1. Organization identity and profile summary
2. Assessment state
3. Portfolio / institutional summary already available in read models
4. Five capability results
5. Fit, confidence, freshness, completeness where publication policy permits
6. Evidence coverage and provenance summaries
7. Gaps and insufficient-evidence states
8. Overlay information only with `overlay:read`
9. Deterministic difference labels without recommending investment or declaring a winner

## Routes and navigation

| Surface                                   | Phase 7 role                                     |
| ----------------------------------------- | ------------------------------------------------ |
| `/compare`                                | Activated comparison                             |
| `/` Overview                              | Shortlist Compare inbound (opaque href)          |
| `/organizations` Explorer                 | Result-row Compare inbound (opaque href)         |
| `/organizations/[organizationRef]` Detail | Detail-action Compare inbound (opaque href)      |
| Attention / evidence-review queues        | Explicitly **outside** Batch 4 / Phase 7 inbound |
| `/briefs`, exports, notes                 | Explicitly deferred                              |

## Acceptance criteria

1. Exactly two or three organizations compare; other counts handled as empty/partial/malformed
2. URLs and client state contain only opaque public refs
3. Unauthorized, invalid, duplicate, and nonexistent refs fail closed without leaking raw IDs
4. No Phase 4 score/methodology/partition changes
5. No raw organization, evidence, provenance, or capability IDs in HTML, RSC payloads, URLs, or client state
6. Restricted evidence / overlays remain gated; no private notes
7. Route + header noindex / nofollow / noarchive preserved
8. Accessible selection/removal; keyboard usable; real 200% browser zoom usable
9. Responsive at 320, 375, 768, 1024, 1440, 1920
10. Loading, empty, partial, error, not-found/malformed states present

## Implementation batches (completed)

| Batch | Outcome                                                 | Commit                                                    |
| ----- | ------------------------------------------------------- | --------------------------------------------------------- |
| 1     | Contracts, query, fail-closed service, route activation | `feat: establish Phase 7 comparison foundation`           |
| 2     | Evidence-aware projections and difference states        | `feat: add evidence-aware comparison projections`         |
| 3     | Accessible responsive comparison UI                     | `feat: build accessible responsive comparison experience` |
| 4     | Inbound Compare from Overview, Explorer, detail         | `feat: connect organization surfaces to comparison`       |
| 5     | Docs, traceability, full verification                   | `docs: finalize Phase 7 comparison verification`          |

## Non-goals

- Ranking leaderboard or automatic recommendation
- New scoring formulas, weights, or Phase 4 methodology edits
- Briefs, exports, notes, mutations, persistent saved comparisons
- Database, private-data ingestion, production authentication
- AI-generated assessment or narrative
- Vercel configuration or deployment
- Merging or using `preview/phase-6-verification`

## Known limitations

- Local-demo authorization only
- Attention and evidence-review queues do not offer Compare actions
- No-JS checkbox DOM order is alphabetical and non-ranking
- Vercel Preview classification issues on earlier branches are environment/tooling limitations, not Phase 7 product failures

## Explicitly deferred beyond Phase 7

Briefs and the remainder of Foundation Phase 9; exports; notes; mutations; saved comparisons; PostgreSQL/RLS; production auth; billing; external-data collection; AI narratives; Phase 8+.
