# Query semantics

Explorer query contract: `src/application/explorer-query.ts`.

## Defaults

| Param           | Default                   |
| --------------- | ------------------------- |
| sort            | `observed_alignment_desc` |
| page            | `1`                       |
| pageSize        | `12`                      |
| exclusionPolicy | `hide_excluded`           |

## Filter groups (AND)

Text, organization type, lifecycle, tags, assessment status, observed-alignment band, confidence, freshness, assessment completeness, publication eligibility, opportunity context, capability, capability-assessment status, and adapter-validated vertical filters.

Within a multi-select group, values are OR.

## Vertical filters (financial institutions)

Parsed through the adapter: institution kind, scale band, operating region, data availability, service-area type, ownership model, operating-complexity band, digital-service maturity, lending breadth.

## Failure modes

- Invalid enum / page / page size → malformed query state
- Unknown parameters → ignored (do not broaden); surfaced as a notice
- Adapter/version mismatch → fail closed
- Page beyond range → empty recovery with link to last page

## Multi-select

Filter groups that support multiple values use checkbox fieldsets.

- Repeated GET parameters are canonical (`assessmentStatus=assessed&assessmentStatus=insufficient_evidence`)
- Values are trimmed, deduped, and sorted before validation
- Maximum eight unique values per group
- OR within a group; AND across groups

## Clear All

Resets to documented defaults, including the default exclusion policy. Reset returns to `/organizations` defaults without preserving ad-hoc unknown parameters.

## Comparison query (Phase 7)

Organization comparison uses a separate canonical contract: repeated `org` parameters on `/compare` containing only opaque `OrganizationPublicRef` values. See `docs/ORGANIZATION_COMPARISON.md` and `src/application/compare-query.ts`. Explorer filter URLs are independent; Browser Back from Compare restores the prior Explorer query intact.

Institutional briefs use `/briefs` with optional opaque `org=<oref_…>` for directory selection and `/briefs/<bref_…>` for documents. See `docs/INSTITUTIONAL_BRIEFS.md`, `src/application/brief-query.ts`, and `src/application/inbound-brief-action.ts`. Browser Back from a brief restores the prior research-surface URL intact.
