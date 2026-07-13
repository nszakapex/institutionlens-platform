# Organization explorer

Phase 5 explorer at `/organizations`.

## Query state

URL search parameters are canonical. Core search/filter/sort/pagination works via GET forms without JavaScript.

## Semantics

- AND across filter groups
- OR within multi-select values for one group
- Empty filter = no restriction
- Default: hide explicitly excluded organizations (visible as an active default chip)
- Unknown query parameters do not broaden results
- Malformed values fail closed with a safe error state

## Sorting

Allowlist only. Default `observed_alignment_desc`.

For score sorts: assessed organizations first; insufficient-evidence organizations follow without fabricated zero scores.

## Pagination

Default page size 12; allowed 12 / 24 / 48; hard maximum 50. Beyond-range pages return an empty recovery state.

## Search

Safe fields only: display name, organization type, approved tags, approved adapter vocabulary labels. Max 100 characters. No regex, fuzzy search, private notes, or ID search.
