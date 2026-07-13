# Phase 4 plan — Explainable assessment engine

**Status:** Core deliverables implemented (repos, services, foundation preview, docs, validation)  
**Depends on:** Phase 3 domain foundation (complete)  
**Does not begin:** Phase 5 (explorer, ranking UI, briefs, exports)

## Objective

Build a deterministic, explainable, versioned assessment engine that evaluates synthetic organizations against a tenant capability portfolio, records a full rule-reason ledger, and keeps fit, confidence, freshness, assessment completeness, publication eligibility, and opportunity context as separate dimensions.

This is a **prioritization heuristic system**, not a deal-prediction model.

## Non-goals

- Real organization ranking UI, explorer, detail pages, comparison, briefs, or exports
- User-authored rule editors, `eval`, dynamic module loading, or arbitrary expression languages
- Machine learning, LLM scoring, or statistical prediction
- Real client data, CRM integrations, live ingestion, database, or production auth
- Coverage / AD&Co methodology, products, scores, or client material
- Phase 5

## Deliverables

1. Tenant capability portfolio + synthetic catalog binding
2. Tenant-private organization overlay + opportunity-context derivation
3. Versioned rule-set / typed predicate contracts
4. Generic deterministic assessment engine (vertical-agnostic)
5. Independent synthetic financial-institutions rule sets (5 capabilities × 100 points)
6. Capability + portfolio assessments for all 24 synthetic organizations
7. Manifests, fingerprints, methodology drift checks
8. Tenant-safe repositories and application services
9. Minimal foundation-preview integration
10. Requirements traceability and model-governance docs

## Dependency direction

```
UI / application services
  → repositories + assessment application services
    → generic assessment engine / domain contracts
      → vertical adapter supplies rule sets + field bag (never reverse)
```

The generic engine **must not** import `financial-institutions` schemas.

## Clean-room

Phase 4 rules, weights, thresholds, and overlays are independently designed synthetic demo methodology. Documentation may name the Coverage / AD&Co boundary only in allowlisted policy docs; implementation and fixtures must not contain those terms.

## Delivery-model note

Managed multi-tenant, dedicated client, and hybrid remain open. Hybrid is the recommendation; the engine stays deployment-neutral.

## Verification

Preserve Phase 3 checks and add:

- `npm run test:assessment`
- `npm run validate:methodology`
- `npm run validate:assessments`
