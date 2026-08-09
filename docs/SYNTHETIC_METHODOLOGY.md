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

### Prepayment and credit model fit (`cap_syn_fi_ops_analytics`) — 100 pts

| Rule                                                     | Points | Factor                     |
| -------------------------------------------------------- | ------ | -------------------------- |
| Institution kind fits prepayment and credit modeling demo scope | 20     | organizational_profile_fit |
| Balance-sheet scale supports prepayment and credit modeling | 15     | organizational_profile_fit |
| Digital service maturity aligns with mortgage analytics workflows | 20     | capability_alignment       |
| Operating complexity warrants mortgage risk analytics support | 15     | operational_compatibility  |
| Recent public change signal supports timing              | 20     | timing_change_signals      |
| Organization profile freshness is usable                 | 10     | publicly_evidenced_need    |

**Gate:** organization_profile evidence required.

### Loan and market data readiness (`cap_syn_fi_data_quality`) — 100 pts

| Rule                                                  | Points | Factor                     |
| ----------------------------------------------------- | ------ | -------------------------- |
| Profile evidence supports loan and market data readiness review | 18     | organizational_profile_fit |
| Data availability indicates loan and market data readiness | 25     | publicly_evidenced_need    |
| Ownership model aligns with loan-data readiness workflows | 15     | capability_alignment       |
| Lending breadth supports loan and market data themes  | 17     | capability_alignment       |
| Larger scale benefits from loan and market data readiness | 15     | operational_compatibility  |
| Profile freshness supports loan and market data scoring | 10     | publicly_evidenced_need    |

**Gate:** organization_profile evidence required.

### Valuation and risk reporting fit (`cap_syn_fi_portfolio_reporting`) — 100 pts

| Rule                                                 | Points | Factor                     |
| ---------------------------------------------------- | ------ | -------------------------- |
| Institution profile supports valuation and risk reporting | 20     | organizational_profile_fit |
| Scale band supports valuation and risk reporting needs | 20     | organizational_profile_fit |
| Multi-region footprint increases valuation reporting relevance | 15     | operational_compatibility  |
| Operating complexity supports valuation and risk reporting workflows | 15     | operational_compatibility  |
| Digital maturity aligns with valuation reporting delivery | 20     | capability_alignment       |
| Operating context evidence supports valuation reporting | 10     | publicly_evidenced_need    |

**Gate:** operating_context evidence preferred (required gate).

### Macro and stress scenario fit (`cap_syn_fi_scenario_planning`) — 100 pts

| Rule                                                | Points | Factor                     |
| --------------------------------------------------- | ------ | -------------------------- |
| Institution kind fits macro and stress scenario scope | 15     | organizational_profile_fit |
| Higher complexity strengthens macro and stress scenario fit | 25     | operational_compatibility  |
| Digital maturity supports macro scenario workflows  | 15     | capability_alignment       |
| Change signals within scenario-planning window      | 20     | timing_change_signals      |
| Lending breadth supports macro and stress scenario themes | 15     | capability_alignment       |
| Profile freshness supports macro scenario scoring   | 10     | publicly_evidenced_need    |

**Gate:** organization_profile evidence required.

### Model validation and governance fit (`cap_syn_fi_governance_review`) — 100 pts

| Rule                                              | Points | Factor                     |
| ------------------------------------------------- | ------ | -------------------------- |
| Profile evidence supports model validation and governance review | 20     | organizational_profile_fit |
| Ownership model aligns with model-governance themes | 20     | capability_alignment       |
| Data availability informs model validation review | 20     | publicly_evidenced_need    |
| Scale band supports model validation and governance review | 15     | operational_compatibility  |
| Digital maturity aligns with model-governance workflows | 15     | capability_alignment       |
| Supporting evidence freshness is usable           | 10     | publicly_evidenced_need    |

**Gate:** organization_profile evidence required.

## Portfolio priorities (relative weights)

Priorities need not sum to 100. Disabled capabilities are excluded from normalization.

| Capability                    | Priority |
| ----------------------------- | -------- |
| Prepayment and credit model fit | 100      |
| Loan and market data readiness | 80       |
| Valuation and risk reporting fit | 60       |
| Macro and stress scenario fit | 40       |
| Model validation and governance fit | 20       |

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
