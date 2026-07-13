# Phase 8 requirements traceability

**Scope:** Project Phase 8 working tree  
**Classifications:** Implemented = present and verified for synthetic local-demo scope; Partial = meaningful progress with stated gaps; Deferred = outside Phase 8; Planned = accepted for a later Phase 8 batch

## Requirements

| ID    | Requirement                                                     | Classification | Batch | Exact evidence (update as batches land)                                                                        | Remaining limitation           |
| ----- | --------------------------------------------------------------- | -------------- | ----- | -------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| B8-01 | Activate `/briefs` directory with opaque org selection          | Partial        | 1–3   | `briefs/page.tsx`; `BriefsWorkspacePage`; `buildBriefDirectoryPageView`; nav Briefs available                  | Richer selection UX in Batch 3 |
| B8-02 | Canonical individual brief route with opaque `BriefPublicRef`   | Partial        | 1–3   | Tenant-scoped `brief-public-ref.ts`; `briefs/[briefRef]/page.tsx`; `BriefDocumentPage`                         | Full document UI in Batch 3    |
| B8-03 | Fail-closed unauthorized / malformed / not_found / error states | Implemented    | 1–2   | `brief-service.ts`; `brief-service.test.ts`; mid-request auth revocation test                                  | —                              |
| B8-04 | Require `brief:read` + org/assessment read                      | Implemented    | 1     | `requireBriefReadAccess` / `finalizeBriefView`; demo context grants `brief:read` only                          | —                              |
| B8-05 | No raw IDs / private notes in view models                       | Implemented    | 1–2   | `assertNoLeakage` incl. `"notes"`; overlay denial shape; serialization tests                                   | —                              |
| B8-06 | Deterministic templates; no LLM; no Phase 4 recalculation       | Implemented    | 2     | `brief-templates.ts`; deterministic JSON equality test; score parity vs research read model                    | —                              |
| B8-07 | Evidence, provenance, gaps, overlay gating                      | Implemented    | 2     | `visibleEvidence`, `buildProvenanceSummaries`, gap section, `buildOverlayProjection`; restricted/overlay tests | —                              |
| B8-08 | Missing evidence ≠ missing capability                           | Implemented    | 2     | `BRIEF_TEMPLATES.gapInsufficient` / insufficient state copy; Batch 2 insufficient_evidence test                | —                              |
| B8-09 | Available / insufficient / not_published projections            | Implemented    | 2     | `resolveDocumentState` + content rules; available / insufficient / not_published / mixed capability tests      | —                              |
| B8-10 | Accessible workspace + document UI; print-friendly              | Planned        | 3     | Minimal section render only                                                                                    | Batch 3                        |
| B8-11 | Responsive 320–1920; real 200% zoom                             | Planned        | 3     | —                                                                                                              | Batch 3                        |
| B8-12 | Inbound Open brief from Overview/Explorer/detail/Compare        | Planned        | 4     | —                                                                                                              | Batch 4                        |
| B8-13 | Preserve Explorer filters / Browser Back                        | Planned        | 4     | —                                                                                                              | Batch 4                        |
| B8-14 | noindex / nofollow / noarchive                                  | Implemented    | 1     | `briefs` + `briefs/[briefRef]` metadata; `route-boundary.contract.test.ts`                                     | —                              |
| B8-15 | Docs + full verify + Phase 4 regression                         | Planned        | 5     | —                                                                                                              | Batch 5                        |
| B8-16 | `brief:draft` / `brief:approve` / export mutations              | Deferred       | —     | Vocabulary retained in `authorization/policy.ts`                                                               | Explicit Phase 8 non-goal      |
| B8-17 | PDF/Word download, email, public sharing                        | Deferred       | —     | Non-goals in `PHASE_8_PLAN.md` / D-020                                                                         | —                              |

## Batch completion log

| Batch | Outcome                                              | Commit (when requested)                            | Checks recorded                                              |
| ----- | ---------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------ |
| 1     | Plan, ADR, contracts, fail-closed shells, route act. | `21a8553` feat: establish Phase 8 brief foundation | format ✓ lint ✓ typecheck ✓ brief tests ✓ security ✓ build ✓ |
| 2     | Projections + templates                              | Pending user commit request                        | format ✓ lint ✓ typecheck ✓ brief tests ✓ security ✓ build ✓ |
| 3     | Workspace + document UI                              | —                                                  | —                                                            |
| 4     | Inbound navigation                                   | —                                                  | —                                                            |
| 5     | Docs finalize + full verify                          | —                                                  | —                                                            |

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
