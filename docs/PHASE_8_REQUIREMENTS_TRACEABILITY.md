# Phase 8 requirements traceability

**Scope:** Project Phase 8 working tree  
**Classifications:** Implemented = present and verified for synthetic local-demo scope; Partial = meaningful progress with stated gaps; Deferred = outside Phase 8; Planned = accepted for a later Phase 8 batch

## Requirements

| ID    | Requirement                                                     | Classification | Batch | Exact evidence (update as batches land)                                                  | Remaining limitation |
| ----- | --------------------------------------------------------------- | -------------- | ----- | ---------------------------------------------------------------------------------------- | -------------------- |
| B8-01 | Activate `/briefs` directory with opaque org selection          | Implemented    | 1–3   | `BriefsWorkspacePage` + `BriefSelectionForm`; briefState labels; eligibility caveat copy | —                    |
| B8-02 | Canonical individual brief route with opaque `BriefPublicRef`   | Implemented    | 1–3   | Tenant-scoped `bref_`; `BriefDocumentPage` research hierarchy                            | —                    |
| B8-03 | Fail-closed unauthorized / malformed / not_found / error states | Implemented    | 1–3   | Service states + workspace/document UI state branches                                    | —                    |
| B8-04 | Require `brief:read` + org/assessment read                      | Implemented    | 1     | `requireBriefReadAccess` / `finalizeBriefView`; demo context grants `brief:read` only    | —                    |
| B8-05 | No raw IDs / private notes in view models                       | Implemented    | 1–3   | Leakage asserts; UI contract forbids raw ID patterns; client island boundary             | —                    |
| B8-06 | Deterministic templates; no LLM; no Phase 4 recalculation       | Implemented    | 2     | `brief-templates.ts`; deterministic JSON equality; score parity                          | —                    |
| B8-07 | Evidence, provenance, gaps, overlay gating                      | Implemented    | 2–3   | Projection gating + evidence index/support links in document UI                          | —                    |
| B8-08 | Missing evidence ≠ missing capability                           | Implemented    | 2–3   | Templates + insufficient state legend/copy                                               | —                    |
| B8-09 | Available / insufficient / not_published projections            | Implemented    | 2–3   | Projection states + directory state pills + document status badge                        | —                    |
| B8-10 | Accessible workspace + document UI; print-friendly              | Implemented    | 3     | `BriefSelectionForm`; classification badges; `briefs.css` print rules; contract tests    | Browser matrix below |
| B8-11 | Responsive 320–1920; real 200% zoom                             | Implemented    | 3     | Responsive CSS; CDP `setPageScaleFactor` with `visualViewport.scale===2` at 320/1024     | —                    |
| B8-12 | Inbound Open brief from Overview/Explorer/detail/Compare        | Planned        | 4     | —                                                                                        | Batch 4              |
| B8-13 | Preserve Explorer filters / Browser Back                        | Planned        | 4     | —                                                                                        | Batch 4              |
| B8-14 | noindex / nofollow / noarchive                                  | Implemented    | 1–3   | Route metadata + UI contract                                                             | —                    |
| B8-15 | Docs + full verify + Phase 4 regression                         | Planned        | 5     | —                                                                                        | Batch 5              |
| B8-16 | `brief:draft` / `brief:approve` / export mutations              | Deferred       | —     | Vocabulary retained in `authorization/policy.ts`                                         | Explicit non-goal    |
| B8-17 | PDF/Word download, email, public sharing                        | Deferred       | —     | Print CSS only; no product export                                                        | Explicit non-goal    |

## Batch completion log

| Batch | Outcome                                              | Commit (when requested)                                           | Checks recorded                                                                                                                                                    |
| ----- | ---------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | Plan, ADR, contracts, fail-closed shells, route act. | `21a8553` feat: establish Phase 8 brief foundation                | format ✓ lint ✓ typecheck ✓ brief tests ✓ security ✓ build ✓                                                                                                       |
| 2     | Projections + templates                              | `9ef8851` feat: add deterministic institutional brief projections | format ✓ lint ✓ typecheck ✓ brief tests ✓ security ✓ build ✓                                                                                                       |
| 3     | Workspace + document UI                              | Pending commit                                                    | format ✓ lint ✓ typecheck ✓ focused brief/UI/boundary ✓ security ✓ build ✓; CDP page-scale `scale===2` @320/1024; print stress; not_published coverage suppression |
| 4     | Inbound navigation                                   | —                                                                 | —                                                                                                                                                                  |
| 5     | Docs finalize + full verify                          | —                                                                 | —                                                                                                                                                                  |

## Permission matrix (Phase 8 brief reads)

| Permission                 | Analyst | Reviewer |    Administrator |
| -------------------------- | ------: | -------: | ---------------: |
| `brief:read`               |     Yes |      Yes |              Yes |
| `organization:read`        |     Yes |      Yes |              Yes |
| `assessment:read`          |     Yes |      Yes |              Yes |
| `evidence:restricted_read` |      No |       No |              Yes |
| `overlay:read`             |     Yes |      Yes |              Yes |
| `brief:draft`              |  Unused |   Unused | Unused (Phase 8) |
| `brief:approve`            |  Unused | Unused\* | Unused (Phase 8) |

\*Reviewer retains policy bit for future workflow; Phase 8 does not invoke it.

## Batch 3 browser verification evidence

Recorded against production `next build` + `next start` on 2026-07-13 (local-demo).

| Check                                                     | Result                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace widths 320 / 375 / 768 / 1024 / 1440 / 1920     | No page-level horizontal overflow; one H1; skip link present                                                                                                                                                                                                                |
| First Tab target                                          | `a.skip-link` → `#main`                                                                                                                                                                                                                                                     |
| Selection                                                 | 24 radio candidates with opaque `oref_` values; Open brief navigates to `bref_`                                                                                                                                                                                             |
| Available / insufficient / not_published documents        | Cloudmere / Cedar Hollow / Bluefen; classification text labels present                                                                                                                                                                                                      |
| Document widths (same matrix)                             | No overflow; 14 section H2s + evidence index; support links use title fragments                                                                                                                                                                                             |
| Malformed routes (`not-a-brief`, `bref_`, overlong token) | Fail closed; no raw-ID leaks                                                                                                                                                                                                                                                |
| Valid-shaped unknown `bref_` + 20 hex                     | Not found / unavailable shell (no internal IDs)                                                                                                                                                                                                                             |
| Print media                                               | `.il-product-header`, demo banner, footer, `.il-no-print` → `display:none`; `.il-print-only` visible; methodology + disclaimer retained                                                                                                                                     |
| CSS `zoom: 200%` at 320 and 1024                          | Superseded — not cited as final WCAG 200% evidence                                                                                                                                                                                                                          |
| Genuine page-scale 200% (`Emulation.setPageScaleFactor`)  | `visualViewport.scale === 2` at 320 and 1024 baselines (workspace + available/insufficient/not_published). No page-level `overflow-x`, no two-axis document scroll, no clipped main controls. Nested section/observation rect containment is expected (not visual overlap). |
| Print stress (long titles/URLs, break-inside)             | Temporary DOM stress only: long org/evidence titles wrap without overflow; `.il-print-only` long `.example` URL visible; `break-inside: avoid` on observation/evidence units; chrome hidden; no auth-hidden raw-ID leaks                                                    |
| not_published print                                       | No `\d+ of \d+` coverage/score leakage after coverage suppression fix                                                                                                                                                                                                       |
| Reduced motion                                            | Page remains usable with `prefers-reduced-motion: reduce`                                                                                                                                                                                                                   |
| Privacy DOM scan                                          | No `org_syn_fi_` / `ev_syn_` / `prov_syn_` / `cap_syn_` / private notes                                                                                                                                                                                                     |

**Fix during Batch 3 verification:** provenance `sourceReferenceLabel` sanitized so synthetic paths embedding internal org IDs cannot enter the view model (leakage assert). **Final review fix:** `not_published` suppresses portfolio coverage counts (`N of M enabled capabilities`) so print/screen cannot reveal withheld assessment detail.
