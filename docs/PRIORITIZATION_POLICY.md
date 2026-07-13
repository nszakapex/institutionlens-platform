# Prioritization policy

Version: `1.0.0` (Phase 5)

Machine-readable manifests:

- `src/application/prioritization-policy.ts`
- `src/application/attention-policy.ts`

## What the policy defines

- Shortlist eligibility and ordering
- Evidence-review ordering
- Attention categories, severity order ranks, and queue bounds
- Exclusion handling for default shortlist / explorer
- Maximum rows per overview component

## What it does not define

- Fit points, score thresholds, capability weights
- Confidence or completeness thresholds
- Opportunity-context derivation rules (those remain Phase 4)

## Shortlist order

1. Conditional portfolio score descending
2. Assessed priority-weight coverage descending
3. Confidence: high → moderate → low → unknown
4. Freshness: current → aging → stale → unknown
5. Display name ascending
6. Stable internal ID (hidden tiebreaker)

Opportunity context and publication eligibility do not change score or shortlist order.

## Attention queue

Independent of fit ranking. No composite attention score. Deduplicated by organization + reason + capability. Bounded to 10 visible rows with total count.
