# Model governance

**Phase:** 4 assessment methodology governance, extended through Phase 6 UI

## What is governed

- Versioned rule sets, portfolios, overlays, and assessment manifests
- Separate scoring dimensions (fit, confidence, freshness, assessment completeness, publication eligibility, opportunity context)
- Deterministic regeneration via fixed `assessedAt` and fingerprints
- Clean-room boundary: implementation and fixtures must not contain proprietary third-party methodology material (see `CLEAN_ROOM_POLICY.md` and related allowlisted policy docs for Coverage / AD&Co naming)

## Delivery model recommendation

Managed multi-tenant, dedicated client, and hybrid deployments remain open. **Hybrid is the recommendation**: shared control plane with dedicated assessment data planes where client isolation requires it. The assessment engine stays **deployment-neutral** — no hard dependency on a single tenancy shape.

## Change control

1. Methodology version bumps when rule IDs, points, gates, or thresholds change
2. `METHODOLOGY_MANIFEST` must stay aligned with `rules.ts` (enforced by `validate:methodology`)
3. Assessment regeneration must remain deterministic (`validate:assessments`)
4. Safe view models must not leak overlay notes, evidence IDs, or raw tenant/principal identifiers

## Phase 6 executable presentation

The methodology UI is generated from executable declarations rather than a separate hand-maintained rule summary:

- `METHODOLOGY_MANIFEST` pins methodology, catalog, portfolio, overlay-set, thresholds, completeness policy, capability rule references, and fixed assessment time.
- `buildMethodologyPageView` projects executable capabilities, rule sets, required gates, aggregation policy, and version pins into safe user-facing language.
- `validate:methodology` compares manifest declarations to executable rule sets.
- `validate:methodology-ui` compares the rendered methodology view to executable rule titles and points and rejects raw IDs and predictive language.

These checks establish structural drift detection for the current deterministic synthetic implementation. They do not prove that prose and executable conditions are semantically equivalent in every case; methodology changes still require review and version control.

## Lineage and publication governance

The governed lineage chain is:

`Source → Provenance → Evidence → Rule outcome → Capability assessment → Portfolio assessment`

Missing evidence is not evaluated, stale evidence follows explicit rule policy, and restricted evidence requires elevated access before details are projected. Unknown provenance/license remains a publication limitation. A conditional portfolio score covers assessed capabilities only; unresolved weight is not negative fit.

Tenant-private overlays remain outside fit calculation. They may supply a separate opportunity-context label but cannot alter points, bands, confidence, freshness, completeness, or publication eligibility.

## Phase 6 limitations

- All records, sources, and assessments are synthetic and in memory.
- No historical methodology registry, approval workflow, real ingestion, database, or production authentication exists.
- The methodology UI exposes safe rule descriptions, not raw executable condition objects.
- The representative lineage diagram shows one awarded chain; complete ledgers provide the full rule accounting.
- No production performance, availability, or predictive-validity claim is made.

## Explicit non-goals

- Machine learning or LLM scoring
- User-authored expression languages / `eval`
- Claiming predictive power over real institutions or deals
- Real ingestion, methodology editing, briefs, comparison, exports, and production deployment

## Phase boundary

Phase 6 read-only governance surfaces are implemented for synthetic data. Phase 7 has not started.
