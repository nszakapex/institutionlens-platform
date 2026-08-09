# Capability portfolios

**Phase:** 4

## What a portfolio is

A **capability portfolio** is a tenant-owned binding between:

- A vertical adapter version
- A capability catalog version
- Enabled/disabled capability refs with relative priorities
- Pinned rule-set IDs and versions
- Aggregation and assessment policy versions

It answers: “Which synthetic capabilities does this workspace evaluate, and with what relative priority?”

## Synthetic demo portfolio

| Field                       | Value                            |
| --------------------------- | -------------------------------- |
| ID                          | `portfolio_syn_fi_demo_research` |
| Name                        | Mortgage analytics institutional-fit portfolio |
| Status                      | active                                         |
| Capabilities                | 5 enabled                                      |
| Catalog / portfolio version | `1.0.0`                                        |

Priorities are relative weights (prepayment/credit model fit highest). They need not sum to 100.

### Aggregation (`priority_weighted_average`)

Contribution ledger rows always include every enabled capability (priority, normalized weight among **all** enabled capabilities, fit status, and `includedInAggregate`). Missing or insufficient capabilities never disappear from the ledger.

When the portfolio remains assessable (assessed-capability ratio and insufficient-capability ratio gates pass), the portfolio priority score is:

`floor(Σ(priority_i × pointsAwarded_i) × 100 / Σ(priority_i × pointsPossible_i))`

over **assessed capabilities only**. That score is therefore **conditional on the assessed subset** — it renormalizes using assessed weighted possible points, not total enabled weight. Insufficient evidence is not treated as zero-fit (negative evidence); those capabilities are excluded from the numerator and denominator while remaining visible with `includedInAggregate: false`. Assessed weight/coverage is recoverable from contribution priorities and the `includedInAggregate` flags. If too much of the enabled portfolio is unassessable, portfolio status is `insufficient_evidence` and the score is null (fail-closed).

## Access

- Repository: `PortfolioRepository` / `SyntheticPortfolioRepository`
- Permission: `methodology:read`
- Cross-tenant access fails closed with `NotFoundError`

Safe portfolio summaries expose name, description, status, and capability counts — not raw tenant IDs.

## Non-goals

- User-authored portfolio editors (later)
- Multi-portfolio comparison UI (Phase 5+)
- Changing fit points via portfolio configuration beyond declared priorities and rule-set pins
