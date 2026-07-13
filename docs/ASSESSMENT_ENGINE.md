# Assessment engine

**Phase:** 4  
**Status:** Implemented for synthetic demo

## Purpose

The assessment engine evaluates synthetic organizations against a tenant capability portfolio using typed predicates and versioned rule sets. It produces explainable capability and portfolio assessments with a full rule-reason ledger.

This is a **prioritization heuristic system**, not a deal-prediction, credit, or pricing model.

## Architecture

```
UI / application services
  → repositories + assessment application services
    → generic assessment engine (`src/assessment/`)
      → vertical adapter supplies rule sets + field bag (never reverse)
```

The generic engine under `src/assessment/` must not import financial-institutions schemas. Vertical rule sets and field bags live under `src/verticals/financial-institutions/assessment/`.

## Separate dimensions

Every capability assessment carries independent dimensions:

| Dimension               | Meaning                                                                   |
| ----------------------- | ------------------------------------------------------------------------- |
| Fit                     | Integer points vs declared maximum; observed alignment band when assessed |
| Confidence              | Evidentiary support strength — not fit magnitude                          |
| Freshness               | Temporal validity of supporting evidence                                  |
| Assessment completeness | Whether required rules/gates could be evaluated for this run              |
| Publication eligibility | Export / sharing policy gate                                              |
| Opportunity context     | Overlay-derived relationship signal (internal-only)                       |

Organization-level formal Completeness remains `unknown` in the demo. Evidence-state coverage (Phase 3) remains a separate epistemic-count summary and must not be labeled Completeness.

## Determinism

- Injected `assessedAt` only (fixed for synthetic runs)
- Integer points; missing/stale evidence does not shrink the denominator
- Manifests fingerprint evidence inputs and assessment outputs
- No `eval`, dynamic module loading, ML, or LLM scoring

## Tenant-safe access

Repositories require `AuthorizationContext` and `assessment:read`. Cross-tenant access returns `NotFoundError` without existence disclosure. Safe view models omit raw tenant IDs, principal IDs, overlay notes, provenance refs, evidence IDs, and machine reason codes.

## Verification

- `npm run test:assessment`
- `npm run validate:methodology`
- `npm run validate:assessments`
