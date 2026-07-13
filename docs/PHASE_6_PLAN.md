# Phase 6 plan — Organization detail, evidence, and methodology

**Status:** Implemented in the current working tree; Phase 7 not started  
**Depends on:** Phases 0–5  
**Does not include:** Comparison, briefs, exports, notes, mutations, database, real auth, Phase 7

## Goal

Build a defensible organization-level research experience where an authorized analyst can open an organization from Overview or Explorer and inspect:

1. Synthetic profile
2. Portfolio fit without predictive language
3. Capability-by-capability assessments
4. Complete rule ledgers
5. Evidence and provenance lineage
6. Change-signal history
7. Safe tenant-private overlay context
8. Confidence, freshness, completeness, and publication constraints
9. Executable methodology and assessment reproducibility

## Traceability chain

`Source → Provenance → Evidence → Rule outcome → Capability assessment → Portfolio assessment`

## Architecture

```text
src/domain/organization-public-ref.ts
src/application/
  detail-view-models.ts
  detail-service.ts
  evidence-catalog-query.ts
  evidence-catalog-service.ts
  methodology-view-models.ts
  methodology-service.ts
src/components/detail/
src/components/evidence/
src/components/methodology/
```

Rules:

- Resolve `OrganizationPublicRef` only after authorization.
- One bounded detail read-model build per request.
- UI never accesses fixtures or recalculates scores.
- No global cross-tenant cache; authz checked every request.
- Restricted evidence requires `evidence:restricted_read`.
- Overlay section requires `overlay:read` and never alters fit.

## Routes

| Route                              | Role                                |
| ---------------------------------- | ----------------------------------- |
| `/organizations/[organizationRef]` | Organization detail                 |
| `/evidence`                        | Evidence / provenance catalog       |
| `/methodology`                     | Executable methodology presentation |
| `/`                                | Overview (add detail links)         |
| `/organizations`                   | Explorer (add detail links)         |
| Compare / Briefs / Settings        | Explicitly unavailable              |

## Phase slices

### 6A — Contracts and read models

Public refs, permissions, detail/evidence/methodology view models and services, security tests.

### 6B — Organization detail

One-page research surface with portfolio, capabilities, ledgers, lineage, signals, gaps, overlay, manifest.

### 6C — Evidence and methodology

Catalog filters/pagination; methodology generated from executable manifest; navigation activation.

### 6D — Integration and verification

Overview/Explorer links, noindex controls, docs/traceability, Playwright, full verify. Stop before commit.

Current classification:

- Overview/Explorer detail links, route-level noindex metadata, safe loading/error boundaries, technical documentation, unit/contract tests, lineage validation, and methodology UI validation are implemented.
- Browser-level Playwright coverage and production-scale performance validation are not present in the current working tree and remain partial/deferred validation work.
- Full-repository verification is an execution step, not a product capability; see the latest verification output rather than treating this plan as evidence that it passed.

## Non-goals

Side-by-side comparison, saved views, notes, brief generation, exports, CRM, rule editing, real ingestion, database, production auth, deployment, Phase 7.

## Delivered documentation

- `ORGANIZATION_DETAIL.md`
- `EVIDENCE_AND_PROVENANCE.md`
- `DATA_LINEAGE.md`
- `METHODOLOGY_UI.md`
- `PRIVATE_CONTEXT_UI.md`
- `PHASE_6_REQUIREMENTS_TRACEABILITY.md`

## Boundary after Phase 6

Phase 6 is a read-only synthetic research experience. Future briefs and real ingestion are deferred, together with comparison, exports, notes, mutations, database persistence/RLS, production authentication, deployment, and measured production performance. Phase 7 has not started.
