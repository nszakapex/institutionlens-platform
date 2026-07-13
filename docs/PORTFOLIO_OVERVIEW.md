# Portfolio overview

Phase 5 functional overview at `/`.

## Purpose

A read-only institutional research surface for the synthetic financial-institutions universe. It surfaces prioritization heuristics for human review — not deal forecasts.

## Sections

1. **Header** — InstitutionLens, vertical label, synthetic notice, heuristic disclaimer, methodology/dataset versions, as-assessed timestamp
2. **Universe summary** — tenant-scoped totals from the assessment read model
3. **Observed-alignment distribution** — assessed portfolio bands only; insufficient evidence separate
4. **Observed-alignment shortlist** — max 8 assessed, non-excluded organizations
5. **Evidence review required** — insufficient-evidence portfolios without numeric scores
6. **Attention / review queue** — max 10 deterministic attention items (not fit ranking)
7. **Capability opportunity summary** — overlay-only opportunity contexts per capability
8. **Signals to review** — max 5 publication-safe change signals

## Integrity

- Counts are derived, never hardcoded in UI components
- Conditional portfolio score coverage is disclosed with every score
- Opportunity context never alters ordering or fit
- No raw tenant, principal, evidence, or overlay IDs
