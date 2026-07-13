# Phase 7 requirements traceability

**Scope:** Project Phase 7 working tree through Batch 5  
**Classifications:** Implemented = present and verified for synthetic local-demo scope; Partial = meaningful implementation with stated gaps; Deferred = outside Phase 7

## Requirements

| Requirement                                              | Classification | Exact code/test evidence                                                                                                          | Remaining limitation                                    |
| -------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Canonical repeated `org` URL with opaque refs only       | Implemented    | `src/application/compare-query.ts`; `src/application/compare-query.test.ts`; `docs/ORGANIZATION_COMPARISON.md`                    | Format validation only on client helpers                |
| Empty / partial / ready / malformed / not_found / unauth | Implemented    | `src/application/compare-service.ts`; `src/application/compare-service.test.ts`; `src/components/compare/ComparePage.tsx`         | Unauthorized requires permission-stripped demo context  |
| Max three orgs; dedupe; selection order not ranking      | Implemented    | `compare-query.ts`; `compare-service.test.ts` column-order cases; `src/lib/compare-url.ts` comment + tests                        | No-JS checkbox DOM order is alphabetical, non-ranking   |
| Reuse Phase 4 outputs; no recalculation                  | Implemented    | `compare-service.ts` projections from research read model; Phase 4 validators unchanged in `npm run verify`                       | Bound to current synthetic fixture set                  |
| Evidence / gap / overlay projections with gating         | Implemented    | `compare-service.ts` Batch 2 projections; overlay/restricted tests in `compare-service.test.ts`                                   | Overlay “restricted” reveals access denial only         |
| Accessible selection + responsive UI                     | Implemented    | `ComparePage.tsx`; `CompareSelectionForm.tsx`; `detail-evidence-methodology.css`; browser matrix in Batch 5 verification          | CSS zoom is not used as WCAG evidence                   |
| Client island free of server-only imports                | Implemented    | `CompareSelectionForm.tsx`; `src/domain/server-boundary.contract.test.ts`                                                         | Type contracts mirrored locally in the client module    |
| Inbound Compare from Overview / Explorer / detail        | Implemented    | `overview-service.ts`, `explorer-service.ts`, `detail-service.ts` via `compareHrefFor`; UI links with `aria-label`; service tests | Attention and evidence-review queues excluded by design |
| Explorer Back restores filters                           | Implemented    | Ordinary Link navigation; browser verification Batch 4/5                                                                          | Relies on browser history + canonical explorer URLs     |
| Noindex / robots headers                                 | Implemented    | `src/app/(app)/compare/page.tsx` metadata; root layout + `src/lib/security/headers.ts`                                            | Crawler directives are not authorization                |
| No winner / ranking / investment recommendation language | Implemented    | Contrast notes + difference legend; service serialization tests; browser text scans                                               | Heuristic disclaimer language retained intentionally    |
| Privacy: no raw IDs or private notes                     | Implemented    | Compare/overview/explorer/detail service tests; security suite; browser DOM/URL scans                                             | Pattern tests are not formal information-flow proof     |
| Briefs / exports / notes / mutations / saved compares    | Deferred       | Non-goals in `docs/PHASE_7_PLAN.md`, D-019                                                                                        | Explicitly out of Phase 7                               |
| Production auth / DB / Vercel deploy                     | Deferred       | D-019 non-goals; Vercel Preview noted as tooling limitation                                                                       | Not started                                             |

## Batch completion

| Batch | Outcome                                                      | Commit message                                            |
| ----- | ------------------------------------------------------------ | --------------------------------------------------------- |
| 1     | Contracts, query, fail-closed service, `/compare` activation | `feat: establish Phase 7 comparison foundation`           |
| 2     | Evidence-aware projections and difference states             | `feat: add evidence-aware comparison projections`         |
| 3     | Accessible responsive comparison UI                          | `feat: build accessible responsive comparison experience` |
| 4     | Inbound Compare from Overview, Explorer, detail              | `feat: connect organization surfaces to comparison`       |
| 5     | Docs, traceability, full verification                        | `docs: finalize Phase 7 comparison verification`          |

## Permission matrix (unchanged from Phase 6 for compare reads)

| Permission                 | Analyst | Reviewer | Administrator |
| -------------------------- | ------: | -------: | ------------: |
| `organization:read`        |     Yes |      Yes |           Yes |
| `assessment:read`          |     Yes |      Yes |           Yes |
| `evidence:restricted_read` |      No |       No |           Yes |
| `overlay:read`             |     Yes |      Yes |           Yes |
| `comparison:create`        |  Future |   Future |        Future |
