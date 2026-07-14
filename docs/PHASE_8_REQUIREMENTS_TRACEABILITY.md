# Phase 8 requirements traceability

**Scope:** Project Phase 8 complete for synthetic local-demo  
**Classifications:** Implemented = present and verified; Deferred = outside Phase 8 / explicit non-goal

## Requirements

| ID    | Requirement                                                     | Classification | Batch | Proving commit / evidence                                                | Remaining limitation |
| ----- | --------------------------------------------------------------- | -------------- | ----- | ------------------------------------------------------------------------ | -------------------- |
| B8-01 | Activate `/briefs` directory with opaque org selection          | Implemented    | 1â€“3 | `21a8553`â€“`95fdc12`; `BriefsWorkspacePage` + `BriefSelectionForm`      | â€”                  |
| B8-02 | Canonical individual brief route with opaque `BriefPublicRef`   | Implemented    | 1â€“3 | `21a8553`â€“`95fdc12`; tenant-scoped `bref_`; `BriefDocumentPage`        | â€”                  |
| B8-03 | Fail-closed unauthorized / malformed / not_found / error states | Implemented    | 1â€“3 | `21a8553`â€“`95fdc12`; service + UI state branches                       | â€”                  |
| B8-04 | Require `brief:read` + org/assessment read                      | Implemented    | 1     | `21a8553`; `requireBriefReadAccess` / `finalizeBriefView`                | â€”                  |
| B8-05 | No raw IDs / private notes in view models                       | Implemented    | 1â€“5 | Leakage asserts; UI contracts; Batch 5 privacy scan                      | â€”                  |
| B8-06 | Deterministic templates; no LLM; no Phase 4 recalculation       | Implemented    | 2     | `9ef8851`; `brief-templates.ts`; score parity tests                      | â€”                  |
| B8-07 | Evidence, provenance, gaps, overlay gating                      | Implemented    | 2â€“3 | `9ef8851`â€“`95fdc12`; projection + evidence index                       | â€”                  |
| B8-08 | Missing evidence â‰  missing capability                         | Implemented    | 2â€“3 | `9ef8851`â€“`95fdc12`; templates + legend copy                           | â€”                  |
| B8-09 | Available / insufficient / not_published projections            | Implemented    | 2â€“3 | `9ef8851`â€“`95fdc12`; directory pills + document badge                  | â€”                  |
| B8-10 | Accessible workspace + document UI; print-friendly              | Implemented    | 3     | `95fdc12`; Batch 3 browser + print evidence                              | â€”                  |
| B8-11 | Responsive 320â€“1920; real 200% zoom                           | Implemented    | 3     | `95fdc12`; CDP `setPageScaleFactor` `visualViewport.scale===2` @320/1024 | â€”                  |
| B8-12 | Inbound Open brief from Overview/Explorer/detail/Compare        | Implemented    | 4     | `5dae01f`; `inboundBriefActionFor`                                       | â€”                  |
| B8-13 | Preserve Explorer filters / Browser Back                        | Implemented    | 4     | `5dae01f`; Batch 4 Back restoration evidence                             | â€”                  |
| B8-14 | noindex / nofollow / noarchive                                  | Implemented    | 1â€“5 | Route metadata + route-boundary contract; Batch 5 robots check           | â€”                  |
| B8-15 | Docs + full verify + Phase 4 regression                         | Implemented    | 5     | `INSTITUTIONAL_BRIEFS.md`; full `npm run verify`; Phase 4 path check     | â€”                  |
| B8-16 | `brief:draft` / `brief:approve` / export mutations              | Deferred       | â€”   | Vocabulary retained; unused in Phase 8                                   | Explicit non-goal    |
| B8-17 | PDF/Word download, email, public sharing                        | Deferred       | â€”   | Print CSS only; no product export                                        | Explicit non-goal    |

## Batch completion log

| Batch | Outcome                                              | Commit                                                                 | Checks recorded                                                                                                                                                                |
| ----- | ---------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | Plan, ADR, contracts, fail-closed shells, route act. | `21a8553` feat: establish Phase 8 brief foundation                     | format âœ“ lint âœ“ typecheck âœ“ brief tests âœ“ security âœ“ build âœ“                                                                                                       |
| 2     | Projections + templates                              | `9ef8851` feat: add deterministic institutional brief projections      | format âœ“ lint âœ“ typecheck âœ“ brief tests âœ“ security âœ“ build âœ“                                                                                                       |
| 3     | Workspace + document UI                              | `95fdc12` feat: build accessible institutional brief workspace         | format âœ“ lint âœ“ typecheck âœ“ focused brief/UI/boundary âœ“ security âœ“ build âœ“; CDP page-scale `scale===2` @320/1024; print stress; not_published coverage suppression |
| 4     | Inbound navigation                                   | `5dae01f` feat: connect research surfaces to institutional briefs      | format âœ“ lint âœ“ typecheck âœ“ focused integration/boundary âœ“ security âœ“ build âœ“; Browser Back restores Overview/Explorer/detail/Compare exactly                      |
| 5     | Docs finalize + full verify                          | docs: finalize Phase 8 institutional brief verification (Batch 5 HEAD) | full `npm run verify` ✓ (42 files / 273 tests); Phase 4 assessment suite ✓ (56); validators ✓; scans ✓; build ✓; short smoke ✓; privacy/robots ✓                               |

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

Recorded against production `next build` + `next start` on 2026-07-13 (local-demo). See commit `95fdc12`.

| Check                                                     | Result                                                                                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Workspace widths 320 / 375 / 768 / 1024 / 1440 / 1920     | No page-level horizontal overflow; one H1; skip link present                                                                               |
| First Tab target                                          | `a.skip-link` â†’ `#main`                                                                                                                  |
| Selection                                                 | 24 radio candidates with opaque `oref_` values; Open brief navigates to `bref_`                                                            |
| Available / insufficient / not_published documents        | Cloudmere / Cedar Hollow / Bluefen; classification text labels present                                                                     |
| Document widths (same matrix)                             | No overflow; 14 section H2s + evidence index; support links use title fragments                                                            |
| Malformed routes (`not-a-brief`, `bref_`, overlong token) | Fail closed; no raw-ID leaks                                                                                                               |
| Valid-shaped unknown `bref_` + 20 hex                     | Not found / unavailable shell (no internal IDs)                                                                                            |
| Print media                                               | `.il-product-header`, demo banner, footer, `.il-no-print` â†’ `display:none`; `.il-print-only` visible; methodology + disclaimer retained  |
| CSS `zoom: 200%`                                          | Superseded â€” not cited as final WCAG 200% evidence                                                                                       |
| Genuine page-scale 200% (`Emulation.setPageScaleFactor`)  | `visualViewport.scale === 2` at 320 and 1024 baselines. No page-level `overflow-x`, no two-axis document scroll, no clipped main controls. |
| Print stress (long titles/URLs, break-inside)             | Temporary DOM stress only; `break-inside: avoid` on observation/evidence units; no auth-hidden raw-ID leaks                                |
| not_published print                                       | No `\d+ of \d+` coverage/score leakage after coverage suppression fix                                                                      |

## Batch 4 browser verification evidence

Recorded against production `next build` + `next start` on 2026-07-13 (local-demo). See commit `5dae01f`.

| Check                                | Result                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| Overview Brief action                | Opaque `/briefs/bref_â€¦`; `aria-label` = `Open institutional brief for {org}` |
| Overview â†’ brief â†’ Back          | Restores `/`                                                                   |
| Explorer filtered â†’ brief â†’ Back | Exact URL restored (`assessmentStatus`, `pageSize`, `page`, `sort`)            |
| Detail â†’ brief â†’ Back            | Exact `/organizations/oref_â€¦` restored                                       |
| Compare 2-org â†’ brief â†’ Back     | Exact canonical compare URL + selection order restored                         |
| Compare 3-org â†’ brief â†’ Back     | Exact canonical compare URL + selection order restored                         |
| 320px Overview/Explorer              | No page-level horizontal overflow with Brief actions                           |
| Storage                              | No localStorage/cookies brief cart                                             |
| Privacy DOM                          | No `org_syn_fi_` / `ev_syn_` / `cap_syn_` on Overview                          |

**Architecture:** shared `inboundBriefActionFor` (server-only); requires `brief:read` + `organization:read`; services must not call `briefPublicRefFor` / `briefDocumentHref` directly for inbound actions.

## Batch 5 final verification evidence

Recorded 2026-07-13 (local-demo).

| Check                               | Result                                                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run verify`                    | Pass â€” 42 test files, 273 tests; all validators; asset/secret/clean-room scans; production build                                    |
| Phase 4 source diff `f5b7db2..HEAD` | No changes under `src/assessment/**` or FI assessment methodology paths                                                               |
| Phase 4 regression suite            | 9 files / 56 tests pass; `validate:methodology` + `validate:assessments` pass                                                         |
| package-lock.json                   | Present; `npm ls --package-lock-only` resolves; SHA-256 recorded in Batch 5 notes                                                     |
| Short smoke (1â€“8)                 | Overview/Explorer/detail/Compare Back restored; directory available/insufficient/not_published; skip link + evidence link             |
| Privacy raw-ID scan                 | Clean on Overview, Explorer, detail, Compare, `/briefs`, available/insufficient/not_published/malformed/not-found briefs              |
| Robots                              | Route metadata `noindex, nofollow, noarchive`; response `X-Robots-Tag: noindex, nofollow, noarchive` on `/briefs` and brief documents |

Note: one transient empty robots meta after client `router.push` was rechecked with fresh navigation and confirmed present â€” not a product failure.

## Deferred work (explicit)

- Persistence / database / RLS
- Real production authentication and multi-tenant hosting
- Billing
- PDF/Word export, email, public sharing
- Mutable draft/approve brief workflow
- Notes, CRM, external-data collection
- AI narrative generation
- Production deployment / Vercel Git reconnect
- Vercel Preview classification anomalies on earlier branches are tooling/environment only
