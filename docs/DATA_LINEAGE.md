# Data lineage

**Phase:** 6  
**Scope:** synthetic organization assessment read surfaces

## Canonical chain

`Source → Provenance → Evidence → Rule outcome → Capability assessment → Portfolio assessment`

The chain explains how a publication-safe source label becomes an input to a deterministic assessment. It is not a claim of real-world verification, causation, intent, or predictive accuracy.

## Stage responsibilities

### 1. Source

The source is the synthetic origin represented by safe source metadata. Raw synthetic source references are server-only and are not included in detail view models.

### 2. Provenance

A `ProvenanceRecord` describes source type, validation status, license status, access classification, dates/reporting period, and optional checksum. Evidence that claims verified status must satisfy provenance invariants. Unknown or absent license/provenance is surfaced as a publication limitation.

### 3. Evidence

An `EvidenceRecord` carries evidence type, epistemic status, observation/summary, freshness, confidence, publication eligibility, organization ownership, and an optional provenance link. Missing evidence has no fabricated observation. Stale evidence retains its original date and state. Restricted evidence is redacted unless the current context has the elevated permission.

### 4. Rule outcome

The assessment engine evaluates versioned rule definitions and writes complete ledger entries. Each row records outcome, points awarded/possible, reason, rule-set version, evidence references, publication eligibility, freshness states, and epistemic states. Outcomes include awarded, not awarded, not evaluated because evidence is missing/stale/restricted, and blocked by a required gate.

### 5. Capability assessment

All ledger rows for a capability contribute to its assessed or insufficient-evidence status. The detail service calculates factor-category contribution summaries but does not recalculate assessment scores. Missing, stale, or inaccessible required evidence can prevent assessment; it does not become a zero-valued statement of poor fit.

### 6. Portfolio assessment

The portfolio aggregates assessed capabilities under the executable priority and coverage policy. A score is conditional on assessed capability coverage. Unassessed priority weight remains visible and is excluded from the score denominator rather than treated as negative alignment.

## UI projection

`buildOrganizationDetailPageView` joins the tenant-scoped research model, evidence, provenance, executable rule metadata, capability names, and portfolio result into a deep-frozen redacted view.

The detail page presents lineage in three forms:

1. Complete rule-ledger rows with safe evidence labels for each rule.
2. One representative awarded six-stage chain in `DetailLineage`.
3. A capability summary of awarded rule counts and points.

The representative diagram is illustrative of one actual awarded row in the current view; it is not a graph of every chain. The complete ledgers are the authoritative UI accounting for all rule outcomes.

## Redaction behavior

- Internal IDs are used only as server-side join keys.
- Available evidence is projected to safe titles, summaries, labels, and dates.
- Restricted evidence becomes “Restricted evidence”; its source becomes unavailable/restricted.
- Provenance is shown only when reachable through evidence visible to the current role.
- Raw rule IDs and predicate logic are not published in UI view models.
- Overlay notes, raw source references, tenant IDs, and principal IDs are omitted.

The lineage validator serializes every synthetic detail view and rejects raw internal identifier patterns and raw synthetic source references. It also requires every awarded UI ledger row to have positive points and a non-empty safe lineage label.

## Missing, stale, and restricted paths

| Condition                   | Ledger/UI behavior                                                      | Portfolio meaning                                    |
| --------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| Missing required evidence   | Not evaluated or blocked by gate; no fabricated observation             | May create insufficient coverage; never negative fit |
| Stale evidence              | Declared stale; rule-specific stale policy determines award eligibility | Limitation remains visible; review recommended       |
| Restricted and unauthorized | Placeholder only; source/provenance withheld                            | May be not evaluated as restricted                   |
| Restricted and authorized   | Safe evidence fields may be shown                                       | Still subject to publication policy                  |
| Unknown provenance/license  | Publication limitation                                                  | Must be resolved before external publication         |

## Current completeness

Implemented:

- six-stage conceptual chain;
- complete rule ledgers on organization detail;
- evidence-to-rule and rule-to-capability mappings;
- safe restricted/missing/stale states;
- lineage and raw-ID validation.

Partial:

- the UI diagram renders one representative awarded chain, not an interactive graph of every source/evidence/rule edge;
- evidence cards list supported rules/capabilities, but the standalone catalog does not expose a dedicated edge explorer;
- all data is synthetic and generated in memory.

Deferred:

- real ingestion and source connectors;
- persisted lineage graph or event history;
- source-version retention and reprocessing audit;
- database-enforced referential integrity and temporal lineage.

## Future PostgreSQL design

Persist immutable identifiers and versions for provenance, evidence, rule evaluations, capability assessments, and portfolio assessments. A normalized design needs tenant keys on every table and composite foreign keys or RLS-compatible joins that cannot cross tenants. Suggested access paths include:

- evidence by tenant, organization, provenance, publication state, and observed/effective dates;
- ledger-to-evidence join rows indexed in both directions;
- capability assessments by tenant, organization, methodology version, capability, and assessed time;
- portfolio assessments by tenant, organization, portfolio/methodology version, and assessed time;
- immutable assessment-run/manifest identity for reproducibility.

Large lineage payloads should be paginated or fetched by section. Explain plans and payload sizes must be measured; the current fixture validator is not a production benchmark.

## Verification references

- `src/application/detail-service.ts:155-183,190-330,333-512,681-809`
- `src/application/detail-service.test.ts:88-239`
- `src/components/detail/DetailLineage.tsx:6-102`
- `scripts/validate-lineage-ui.ts:5-44`
- `src/domain/invariants.ts`
