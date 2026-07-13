# Methodology UI

**Phase:** 6  
**Route:** `/methodology`  
**Data status:** deterministic synthetic demo only

## Purpose

The methodology route renders a safe, human-readable projection of the same executable declarations used by the synthetic assessment engine. It is not a separately maintained narrative specification.

`buildMethodologyPageView` reads:

- `METHODOLOGY_MANIFEST`;
- executable capability definitions;
- executable rule sets and required gates;
- the executable portfolio aggregation policy;
- engine, domain-schema, adapter, catalog, portfolio, overlay-set, and assessment-time versions.

It then removes raw internal identifiers and executable condition details while retaining rule titles, rationales, point maxima, evidence requirements, gate descriptions, enabled state, and missing/stale/restricted policies.

## Authorization

The route requires `methodology:read`. Analyst, reviewer, and administrator roles currently receive it. The service returns a safe unauthorized state when the permission or active context is missing.

## Executable manifest

`METHODOLOGY_MANIFEST` is a machine-readable declaration in `src/verticals/financial-institutions/assessment/methodology.ts`. It pins:

- methodology, capability-catalog, portfolio, and overlay-set versions;
- fixed synthetic assessment time;
- observed-alignment band thresholds;
- confidence thresholds;
- completeness policy;
- the invariant that overlays never alter fit;
- five capability entries with rule-set versions, declared maxima, required gate IDs, and rule metadata.

The UI also displays engine, domain schema, and adapter versions. Organization detail adds dataset version, determinism status, superseded status, and a fingerprint preview.

## Drift validation

Two validators cover different boundaries:

1. `scripts/validate-methodology.ts` compares the machine-readable manifest to executable rule sets. It checks five rule sets, declared/enabled totals of 100, rule presence, points, and factor categories.
2. `scripts/validate-methodology-ui.ts` builds the authorized UI view and compares it to executable rules. It requires five capabilities, exactly 30 rendered rules, 100 points per capability, matching titles/points, no raw identifiers, and no prohibited predictive language.

`src/application/methodology-service.test.ts` independently checks permission enforcement, versions, all five capabilities, all rule titles, totals, thresholds, policies, disclaimers, redaction, and fit-invariance wording.

These checks detect the declared classes of drift. They do not prove semantic equivalence between prose rationale and every executable condition, nor do they replace review when rule behavior changes.

## Interpretation policies

- Missing required evidence is not evaluated and is not negative alignment.
- Stale evidence follows each rule's declared stale-evidence behavior.
- Restricted evidence may support internal review only when the rule permits it and access is authorized.
- Required gates must pass before an assessed result is published.
- Portfolio scores are conditional on assessed capabilities.
- Confidence, freshness, completeness, publication eligibility, fit, and opportunity context remain separate dimensions.
- Human judgment is required before prioritization or publication.
- Observed-alignment labels are deterministic heuristics, not predictions.

## Security and privacy

The methodology view omits raw rule IDs, rule-set IDs, capability IDs, executable condition objects, tenant/principal IDs, and private overlay content. Generic noindex metadata reduces accidental indexing but does not grant or enforce authorization. The application service permission check remains mandatory.

## Current limitations

- The UI is generated from the current in-process TypeScript definitions, not from persisted historical manifests.
- There is no methodology editor, approval workflow, effective-date scheduler, migration runner, or historical diff UI.
- The fixed assessment time supports deterministic fixtures, not a production freshness clock.
- The validators check structural alignment and selected content constraints, not every possible behavioral regression.
- The implementation provides no production performance or availability claim.

## Future persistence

PostgreSQL support should treat released manifests and rule-set versions as immutable records, associate every assessment run with exact version IDs, and index by tenant/vertical, version, status, and effective time. Historical UI reads must resolve the manifest used by the assessment rather than “latest.” Publication and activation should be separate governed transitions with audit records. Any future cache key must include authorization scope and all version pins.

## References

- `src/verticals/financial-institutions/assessment/methodology.ts`
- `src/application/methodology-service.ts`
- `src/application/methodology-view-models.ts`
- `src/components/methodology/MethodologyPage.tsx`
- `src/application/methodology-service.test.ts`
- `scripts/validate-methodology.ts`
- `scripts/validate-methodology-ui.ts`
