# Model governance

**Phase:** 4 assessment methodology governance

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

## Explicit non-goals

- Machine learning or LLM scoring
- User-authored expression languages / `eval`
- Claiming predictive power over real institutions or deals
- Phase 5 explorer / ranking / brief / export product surfaces
