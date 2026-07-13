# Phase 5 plan — Portfolio overview & organization explorer

**Status:** Implementation in progress → verification
**Depends on:** Phases 0–4 (assessment engine, synthetic methodology, overlays)  
**Does not include:** Organization detail, briefs, exports, comparison, database, real auth, Phase 6

## Goal

Turn the Phase 4 assessment engine into a useful, read-only research product:

1. Functional portfolio overview
2. Bounded priority shortlist
3. Deterministic attention / evidence-review queues
4. Capability opportunity summary
5. Publication-safe change-signal summary
6. Searchable, filterable organization explorer

## Product integrity

InstitutionLens is a prioritization and research tool. Language must use observed alignment, conditional portfolio score, insufficient evidence, synthetic opportunity context, and prioritization heuristic. It must not claim purchase likelihood, conversion probability, or deal readiness.

## Architecture

```text
src/application/
  research-read-model.ts      # Tenant-scoped join once per request
  prioritization-policy.ts    # Shortlist / queue bounds (no score changes)
  attention-policy.ts         # Attention categories & ordering
  explorer-query.ts           # URL → validated ExplorerQuery
  overview-view-models.ts
  explorer-view-models.ts
  overview-service.ts
  explorer-service.ts

src/components/overview/
src/components/explorer/
```

Rules:

- UI never accesses fixture arrays or repositories.
- Every service requires validated server-side `AuthorizationContext`.
- Scoring and ranking stay on the server; React does not recalculate scores.
- Client parameters never supply tenant IDs.
- Vertical-specific filters parse behind the adapter contract.

## Routes

| Route                   | Role                                                        |
| ----------------------- | ----------------------------------------------------------- |
| `/`                     | Functional portfolio overview                               |
| `/organizations`        | Functional organization explorer                            |
| `/foundation`           | Local-demo design-system / foundation preview (dev surface) |
| Other primary-nav stubs | Explicitly unavailable placeholders                         |

## Phase slices

### 5A — Read models and policies

- Typed explorer query schema
- Safe overview / explorer view models
- Prioritization + attention policies with machine-readable manifests
- Bounded tenant-scoped read services

### 5B — Portfolio overview

- Universe summary, observed-alignment distribution
- Priority shortlist (max 8), evidence-review queue, attention queue (max 10)
- Capability opportunity summary, signals-to-review (max 5)

### 5C — Organization explorer

- URL-canonical GET filters, sort, pagination
- Active-filter chips, Clear All, empty/error/malformed states
- Accessible table + mobile record layout

### 5D — Verification

- Focused scripts, docs/traceability, Playwright MCP, full `npm run verify`
- Stop before commit

## Explicit non-goals

Organization detail pages, evidence ledger pages, comparison, briefs, exports, CRM, real ingestion, rule editing, scoring changes, database, Supabase, production auth, deployment, analytics, Phase 6.

## Clean-room

Consume only InstitutionLens contracts and synthetic data in this repository. See `docs/CLEAN_ROOM_POLICY.md`.
