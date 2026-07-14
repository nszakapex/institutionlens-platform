# Phase 8 plan — Deterministic institutional briefs

**Status:** Complete for synthetic local-demo scope (Batches 1–5)  
**Depends on:** Phases 0–7 (assessment engine, overview/explorer, detail/evidence/methodology, comparison)  
**Does not include:** Database, production auth, billing, private-data ingestion, AI narrative, mutations, PDF/Word export, email, public sharing, Vercel changes

Authoritative surface documentation: `docs/INSTITUTIONAL_BRIEFS.md`  
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

## Delivered architecture

```
src/domain/brief-public-ref.ts          # Opaque bref_ route refs (server-only)
src/application/brief-query.ts          # Directory/detail query parse (opaque refs)
src/application/brief-view-models.ts    # Redacted brief directory + document contracts
src/application/brief-templates.ts      # Fixed claim language
src/application/brief-service.ts        # Authz → resolve → bounded brief read model
src/application/inbound-brief-action.ts # Sole inbound Brief action builder
src/components/briefs/                  # Workspace + document UI + selection island
src/app/(app)/briefs/                   # noindex routes
```

## Batch outcomes

| Batch | Commit subject                                          | Hash (short) |
| ----- | ------------------------------------------------------- | ------------ |
| 1     | feat: establish Phase 8 brief foundation                | `21a8553`    |
| 2     | feat: add deterministic institutional brief projections | `9ef8851`    |
| 3     | feat: build accessible institutional brief workspace    | `95fdc12`    |
| 4     | feat: connect research surfaces to institutional briefs | `5dae01f`    |
| 5     | docs: finalize Phase 8 institutional brief verification | (this batch) |

## Acceptance criteria (met)

1. Briefs generated only from authorized redacted read models
2. Deterministic templates; no LLM narrative; no Phase 4 changes
3. Opaque refs only in URLs/client state
4. States fail closed without leaking raw IDs or private notes
5. Restricted evidence / overlay gating preserved
6. Noindex / nofollow / noarchive preserved
7. Accessible, responsive, print-friendly presentation
8. Inbound navigation without filter loss

## Non-goals (remain deferred)

- Database / Supabase / RLS / production auth / billing
- Real customer data / scraping / AI narrative
- Mutations, comments, CRM, notes
- PDF/Word download, email, public sharing
- Phase 4 methodology or score changes
- Vercel reconnect/deploy; merging `preview/phase-6-verification`

## Verification posture

Each batch ran proportionate format/lint/typecheck/focused tests/security/build (+ targeted browser when UI changed). Final Phase 8 check is full `npm run verify` + Phase 4 regression + short smoke + privacy scan—not a full re-matrix of already-verified Batch 3/4 states.
