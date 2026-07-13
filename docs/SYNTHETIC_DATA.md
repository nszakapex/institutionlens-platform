# Synthetic data

## Declaration

> This dataset is entirely synthetic and exists only to validate InstitutionLens architecture and interface behavior.

## Guarantees

- Exactly **24** fictional financial institutions
- Stable prefixed IDs (`org_syn_fi_001` … `org_syn_fi_024`)
- Single demo domain tenant: `tenant_demo_research`
- Deterministic fixtures — no `Math.random()`, no network, no generated UUIDs at import
- Fixed ISO timestamps
- Categorical scale bands instead of realistic financial figures
- No real organization names, addresses, websites, or regulatory identifiers
- Fit remains `unassessed` for every organization
- Formal Completeness remains `unknown` unless a validated domain record assigns it (none do in Phase 3)
- Evidence set includes verified, calculated, rule-based, inference, missing, stale, and restricted cases
- Synthetic **Verified** means provenance/validation requirements are satisfied inside the demo dataset only — not real-world verification
- Provenance references use `synthetic://financial-institutions/...` only
- Phase 4 adds a **capability portfolio**, a **deliberate subset of private overlays**, and **deterministic capability + portfolio assessments** for all 24 organizations (heuristic prioritization only)
- Overlay notes are tenant-private and never appear in safe view models
- Assessments are regenerated via `generateSyntheticAssessments()` and validated offline

## Validation

- `npm run validate:synthetic`
- `npm run validate:methodology`
- `npm run validate:assessments`
- Dataset and adapter contract tests under `src/verticals/financial-institutions/`
- Assessment tests under `src/assessment/` and `src/repositories/synthetic-assessment-repository.test.ts`

## Clean-room

Fixtures are designed independently. Do not import or reproduce material from the separate AD&Co prototype or any Coverage-derived catalogs, rules, or records.
