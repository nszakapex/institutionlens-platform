# Synthetic methodology

**Vertical:** financial_institutions  
**Methodology version:** `1.0.0`  
**Rule-set version:** `1.0.0`  
**Declared maximum per capability:** 100 points

Independent synthetic demo methodology for architecture validation. Weights and thresholds below match `src/verticals/financial-institutions/assessment/rules.ts`.

## Band thresholds (0–100)

| Band                          | Range  |
| ----------------------------- | ------ |
| limited_observed_alignment    | 0–24   |
| emerging_observed_alignment   | 25–49  |
| meaningful_observed_alignment | 50–74  |
| strong_observed_alignment     | 75–100 |

## Confidence thresholds

| Level    | Support ratio |
| -------- | ------------- |
| high     | ≥ 0.80        |
| moderate | ≥ 0.50        |
| low      | ≥ 0.00        |

Unresolved required rules force low confidence.

## Capability rule weights

### Operational analytics support (`cap_syn_fi_ops_analytics`) — 100 pts

| Rule                                                     | Points | Factor                     |
| -------------------------------------------------------- | ------ | -------------------------- |
| Institution kind fits operational analytics demo scope   | 20     | organizational_profile_fit |
| Balance-sheet scale supports operational analytics       | 15     | organizational_profile_fit |
| Digital service maturity aligns with analytics workflows | 20     | capability_alignment       |
| Operating complexity warrants analytics support          | 15     | operational_compatibility  |
| Recent public change signal supports timing              | 20     | timing_change_signals      |
| Organization profile freshness is usable                 | 10     | publicly_evidenced_need    |

**Gate:** organization_profile evidence required.

### Data-quality modernization (`cap_syn_fi_data_quality`) — 100 pts

| Rule                                                  | Points | Factor                     |
| ----------------------------------------------------- | ------ | -------------------------- |
| Profile evidence supports data-quality review         | 18     | organizational_profile_fit |
| Data availability indicates modernization opportunity | 25     | publicly_evidenced_need    |
| Ownership model aligns with data-quality workflows    | 15     | capability_alignment       |
| Lending breadth supports data-quality themes          | 17     | capability_alignment       |
| Larger scale benefits from data-quality modernization | 15     | operational_compatibility  |
| Profile freshness supports data-quality scoring       | 10     | publicly_evidenced_need    |

**Gate:** organization_profile evidence required.

### Portfolio reporting workflow (`cap_syn_fi_portfolio_reporting`) — 100 pts

| Rule                                                 | Points | Factor                     |
| ---------------------------------------------------- | ------ | -------------------------- |
| Institution profile supports portfolio reporting     | 20     | organizational_profile_fit |
| Scale band supports portfolio reporting needs        | 20     | organizational_profile_fit |
| Multi-region footprint increases reporting relevance | 15     | operational_compatibility  |
| Operating complexity supports reporting workflows    | 15     | operational_compatibility  |
| Digital maturity aligns with reporting delivery      | 20     | capability_alignment       |
| Operating context evidence is present                | 10     | publicly_evidenced_need    |

**Gate:** operating_context evidence preferred (required gate).

### Scenario-planning support (`cap_syn_fi_scenario_planning`) — 100 pts

| Rule                                                | Points | Factor                     |
| --------------------------------------------------- | ------ | -------------------------- |
| Institution kind fits scenario-planning scope       | 15     | organizational_profile_fit |
| Higher complexity strengthens scenario-planning fit | 25     | operational_compatibility  |
| Digital maturity supports scenario workflows        | 15     | capability_alignment       |
| Change signals within planning window               | 20     | timing_change_signals      |
| Lending breadth supports scenario themes            | 15     | capability_alignment       |
| Profile freshness supports scenario scoring         | 10     | publicly_evidenced_need    |

**Gate:** organization_profile evidence required.

### Governance process review (`cap_syn_fi_governance_review`) — 100 pts

| Rule                                              | Points | Factor                     |
| ------------------------------------------------- | ------ | -------------------------- |
| Profile evidence supports governance review       | 20     | organizational_profile_fit |
| Ownership model aligns with governance themes     | 20     | capability_alignment       |
| Data availability informs governance review       | 20     | publicly_evidenced_need    |
| Scale band supports governance review             | 15     | operational_compatibility  |
| Digital maturity aligns with governance workflows | 15     | capability_alignment       |
| Supporting evidence freshness is usable           | 10     | publicly_evidenced_need    |

**Gate:** organization_profile evidence required.

## Portfolio priorities (relative weights)

Priorities need not sum to 100. Disabled capabilities are excluded from normalization.

| Capability                    | Priority |
| ----------------------------- | -------- |
| Operational analytics support | 100      |
| Data-quality modernization    | 80       |
| Portfolio reporting workflow  | 60       |
| Scenario-planning support     | 40       |
| Governance process review     | 20       |

Aggregation: `weight_i = priority_i / sum(enabled priorities)` with policy version `1.0.0`.

Portfolio priority **score** (when assessable) uses assessed capabilities only:

`floor(Σ(priority_i × awarded_i) × 100 / Σ(priority_i × possible_i))` for `fit.status === "assessed"`.

Contribution weights still normalize against all enabled priorities so insufficient capabilities remain visible (`includedInAggregate: false`). The score is conditional on assessed coverage, not a silent full-portfolio claim. Gates: `minAssessedCapabilityRatio = 0.40`, `insufficientPortfolioRatio = 0.50`.

## Opportunity context (overlay-derived)

Overlays never alter fit points. Opportunity status is a separate internal dimension:

| Overlay signal                      | Opportunity status      |
| ----------------------------------- | ----------------------- |
| No overlay                          | unknown                 |
| Excluded relationship               | excluded                |
| Prospect                            | new_logo                |
| Active client + capability not used | cross_sell              |
| Active client + capability active   | existing_use            |
| Former client or former usage       | renewal_or_reengagement |

## Fixed assessment clock

Synthetic runs use `assessedAt = 2026-04-01T12:00:00.000Z` for deterministic regeneration.

## Drift checks

`npm run validate:methodology` asserts rule IDs, points, factor categories, and enabled totals stay aligned with `METHODOLOGY_MANIFEST`.
