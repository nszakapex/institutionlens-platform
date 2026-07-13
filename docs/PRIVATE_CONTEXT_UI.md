# Private context UI

**Phase:** 6  
**Surface:** organization detail, “Synthetic tenant-private overlay”

## Purpose

The private-context section displays a minimized, tenant-scoped projection of relationship and capability-usage context. It supports human interpretation of opportunity context. It is deliberately separate from evidence-derived fit.

## Permission model

`overlay:read` controls this section. Analyst, reviewer, and administrator roles currently receive the permission. The effective check requires both the role allowlist and the permission in the `AuthorizationContext`.

An analyst can read the safe overlay projection but cannot read restricted evidence. These are independent permissions.

| Overlay state            | UI behavior                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Available and authorized | Shows safe relationship, match, review, source-classification, effective/updated dates, and capability-usage labels |
| Present but unauthorized | Shows a restricted state without relationship values                                                                |
| Absent                   | States that relationship and capability-usage context remain unknown                                                |

Absence is not interpreted as prospect, new relationship, or any other positive/negative state.

## Data minimization

The Phase 6 view model includes:

- relationship status label;
- match and review status labels;
- source classification label;
- effective and updated dates;
- capability names with usage-state labels.

It excludes:

- optional overlay notes;
- internal overlay and organization IDs;
- tenant and principal IDs;
- contact data or free-form private narrative;
- raw matching internals.

`detail-service.test.ts` verifies that notes and known private-note fixture text do not serialize.

## Fit invariance

Overlay data does not add, subtract, gate, or otherwise modify capability fit points, observed-alignment bands, confidence, freshness, completeness, publication eligibility, or portfolio score.

The research read model derives opportunity context after synthetic assessments are generated. The detail test builds the same organization with and without `overlay:read` and requires the conditional portfolio score to be identical. The methodology manifest also declares `overlaysNeverAlterFitPoints: true`.

Opportunity context remains a separate internal dimension:

- no overlay → unknown;
- excluded relationship → excluded;
- prospect → new relationship context;
- former relationship → renewal/re-engagement context;
- active relationship uses capability-usage state to distinguish existing use, additional-capability context, or unknown.

These labels do not indicate demand, purchase intent, or outcome probability.

## Tenant isolation

Overlay selection occurs only after the tenant-scoped organization store has been filtered. The current synthetic overlay helper uses internal organization IDs server-side, and the resulting safe overlay is attached only to an organization already admitted to the active tenant read model.

This is application-enforced isolation in a local demo. Production-grade isolation is not claimed.

## Privacy controls

The detail route and application root use non-indexing metadata, security headers include `X-Robots-Tag`, and referrer policy is `no-referrer`. Those controls reduce accidental disclosure through indexing and referrers. They do not replace `overlay:read`, tenant predicates, authentication, authorization, or future database row security.

## Future PostgreSQL requirements

A database implementation should place overlays in a tenant-keyed private relation with:

- uniqueness on `(tenant_id, organization_id)` or an explicit versioned-overlay key;
- indexes by tenant, organization, relationship status, review status, and updated time;
- tenant-consistent foreign keys for capability-usage rows;
- RLS policies tested for direct, joined, and aggregate access;
- separate controls for free-form notes and minimized UI projections;
- audit history for matching/review changes.

Do not join overlays into assessment scoring SQL. Opportunity context may be derived in a separate read projection. Cache keys, if introduced, must include tenant, principal/permission scope, and overlay version; the current implementation intentionally uses no global cache.

## References

- `src/application/research-read-model.ts:109-130,150-207,232-247`
- `src/application/detail-service.ts:639-668`
- `src/application/detail-service.test.ts:157-187,219-239`
- `src/authorization/policy.ts:41-60`
- `src/domain/overlays/`
