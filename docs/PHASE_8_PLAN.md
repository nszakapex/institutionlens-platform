# Phase 8 plan — Deterministic institutional briefs

**Status:** Authoritative for project Phase 8; Batches 1–4 committed; Batch 5 pending  
**Depends on:** Phases 0–7 (assessment engine, overview/explorer, detail/evidence/methodology, comparison)  
**Does not include:** Database, production auth, billing, private-data ingestion, AI narrative, mutations, PDF/Word export, email, public sharing, Vercel changes

Authoritative surface documentation (later batches): `docs/INSTITUTIONAL_BRIEFS.md`  
Traceability: `docs/PHASE_8_REQUIREMENTS_TRACEABILITY.md`  
Decision: `docs/DECISIONS.md` D-020

## Roadmap numbering

| Foundation plan label                         | Delivered as          | Notes                                                              |
| --------------------------------------------- | --------------------- | ------------------------------------------------------------------ |
| Foundation Phase 9 — Comparison (≤3) & briefs | **Split across 7–8**  | Project Phase 7 = comparison; **Project Phase 8 = briefs**         |
| Foundation draft/approve/export workflow      | **Deferred beyond 8** | Phase 8 is synthetic **read-only** generation from existing models |

Project Phase 8 implements the remaining institutional-brief portion of Foundation Phase 9 under the existing synthetic, authorized, redacted read-only architecture.

## Objective

Generate **deterministic, evidence-backed institutional briefs** that summarize one organization for professional research and outreach preparation—explaining available evidence, capabilities, assessment quality, gaps, and limitations—without investment recommendations, Phase 4 recalculation, or free-form LLM narrative.

## Product integrity

- Template-based, reviewable language only
- No ranking, winner, purchase likelihood, or investment advice
- Missing evidence is never described as a missing capability
- Synthetic dataset and local-demo auth context only
- Stable section order and stable output for identical inputs

## Authorization vocabulary (Phase 8)

| Action                                  | Phase 8 use                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| `brief:read`                            | Required to list and view generated brief projections; granted by local-demo context |
| `organization:read` + `assessment:read` | Required alongside `brief:read` for underlying research data                         |
| `brief:draft`                           | Reserved; **unused** (no mutable draft workflow)                                     |
| `brief:approve`                         | Reserved; **unused** (no approval mutations)                                         |
| `export:request`                        | Reserved; **unused** (no downloadable export)                                        |

Synthetic brief “states” (`available`, `insufficient_evidence`, `not_published`, …) are **publication/assessment projections**, not a fake mutable approval pipeline.

## Architecture

```text
src/domain/
  brief-public-ref.ts          # Opaque bref_ route refs (server-only)
src/application/
  brief-query.ts               # Directory/detail query parse (opaque refs)
  brief-view-models.ts         # Redacted brief directory + document contracts
  brief-service.ts             # Authz → resolve → bounded brief read model
src/components/briefs/
  BriefsWorkspacePage.tsx      # Directory / selection shell (Batch 1+)
  BriefDocumentPage.tsx        # Individual brief document (Batch 3)
src/app/(app)/briefs/
  page.tsx                     # Directory workspace (noindex)
  [briefRef]/page.tsx          # Individual brief (noindex)
  loading.tsx / error.tsx
```

Rules:

- URLs and client state use only opaque `OrganizationPublicRef` / `BriefPublicRef`
- Resolve refs server-side after permission checks on every request
- One bounded brief read model per request; no global cache; no reused authz
- Reuse Phase 4/6/7 read-model outputs; **do not** recalculate scores or change methodology
- Restricted evidence and overlays remain permission-gated; no private notes

## Canonical routes

| Form                 | Meaning                                 |
| -------------------- | --------------------------------------- |
| `/briefs`            | Brief directory / workspace             |
| `/briefs?org=<oref>` | Directory with organization preselected |
| `/briefs/<bref_…>`   | Individual brief document               |

`BriefPublicRef` is deterministic from `tenantId` + internal organization id under salt `il:brief-public-ref:v1` (`bref_` + hex). Tenant id is included so the same organization id cannot be correlated across tenants via a shared route token. It is **not** authorization.

## Required brief content (full phase)

When a brief is `available` (or partially projected under insufficient/not-published rules):

1. Title and organization identity
2. As-of date and freshness statement
3. Purpose and permitted-use statement
4. Organization profile
5. Portfolio / institutional summary
6. Assessment state
7. Five capability summaries
8. Fit, confidence, freshness, completeness where publication permits
9. Evidence coverage and permitted provenance
10. Material evidence-backed observations
11. Gaps, unresolved rules, insufficient-evidence conditions
12. Permission-appropriate overlay context
13. Methodology and limitations
14. Explicit non-recommendation disclaimer

## Brief states

| State                   | Meaning                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| `available`             | Publishable synthetic brief content may be shown                   |
| `insufficient_evidence` | Assessment/evidence insufficient; gaps explained, not negative fit |
| `not_published`         | Publication eligibility withholds numeric/external-ready content   |
| `unauthorized`          | Missing required permissions                                       |
| `not_found`             | Unknown opaque ref                                                 |
| `malformed`             | Invalid route/query token                                          |
| `error`                 | Fail-closed unexpected failure                                     |
| `empty` (directory)     | No selection / no eligible rows to show                            |

## Navigation (Batch 4)

Authorized “Open brief” / “View brief” from Overview, Explorer, organization detail, and Compare columns where useful. Preserve filters and Browser Back. Opaque hrefs only, built server-side.

## Implementation batches

### Batch 1 — Plan, contracts, fail-closed shell

**Outcome:** Phase plan + D-020 + traceability; `BriefPublicRef`; query/view-model contracts; fail-closed directory + detail service shells; activate `/briefs` and `/briefs/[briefRef]` with minimal safe UI; nav Briefs available; loading/error boundaries; no full projections yet.

**Checks:** format, lint, typecheck, focused unit/contract tests, security tests, build.

**Suggested commit:** `feat: establish Phase 8 brief foundation`

### Batch 2 — Brief projections and templates

**Outcome:** Deterministic section projections, evidence/provenance, gaps, overlay gating, fixed templates, privacy serialization tests.

**Suggested commit:** `feat: project evidence-backed brief sections`

### Batch 3 — Workspace and document UI

**Outcome:** Accessible directory + document UI; responsive + print-friendly styling; a11y and six-width verification; real 200% zoom.

**Suggested commit:** `feat: render accessible institutional brief UI`

### Batch 4 — Inbound navigation

**Outcome:** Overview / Explorer / detail / Compare → brief links; Back/filter preservation.

**Suggested commit:** `feat: connect research surfaces to briefs`

### Batch 5 — Completion

**Outcome:** `INSTITUTIONAL_BRIEFS.md`, traceability complete, full `npm run verify`, Phase 4 regression, short cross-route smoke, raw-ID scan.

**Suggested commit:** `docs: finalize Phase 8 brief verification`

## Acceptance criteria

1. Briefs generated only from authorized redacted read models
2. Deterministic templates; no LLM narrative; no Phase 4 changes
3. Opaque refs only in URLs/client state
4. States fail closed without leaking raw IDs or private notes
5. Restricted evidence / overlay gating preserved
6. Noindex / nofollow / noarchive preserved
7. Accessible, responsive, print-friendly presentation
8. Inbound navigation without filter loss

## Non-goals

- Database / Supabase / RLS / production auth / billing
- Real customer data / scraping / AI narrative
- Mutations, saved edits, comments, email
- Downloadable PDF/Word export / public sharing
- Phase 4 methodology or score changes
- Vercel deploy or reconnect

## Verification strategy

Each batch runs proportionate format/lint/typecheck/focused tests/security/build (+ targeted browser when UI changes) and updates the traceability matrix. Final Phase 8 check is full verify + Phase 4 regression + short smoke + privacy scan—not a full re-matrix of already-verified states.
