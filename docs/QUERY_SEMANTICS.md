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

Resets to documented defaults, including the default exclusion policy.
