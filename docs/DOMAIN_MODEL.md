# Domain model

**Schema version:** `1.0.0`  
**Phase:** 3 — foundation only (no scoring)

## Boundaries

| Layer                | Responsibility                                                       |
| -------------------- | -------------------------------------------------------------------- |
| `src/domain/`        | Generic identifiers, schemas, errors, clock, invariants, view models |
| `src/authorization/` | Tenant/principal context and explicit action checks                  |
| `src/repositories/`  | Tenant-scoped persistence contracts and synthetic implementation     |
| `src/verticals/`     | Versioned adapters; financial-institutions specialization            |
| `src/application/`   | Thin read services and safe view-model assembly                      |

**Dependency rule:** verticals may import domain contracts. Domain never imports a specific vertical.

## Core entities

- **Tenant / Principal** — demo-flagged, status-aware
- **Organization** — generic fields only; vertical payload validated by adapter
- **Capability** — fictional catalog entries for alignment themes later
- **EvidenceRecord** — epistemic status, freshness, confidence, publication eligibility
- **ProvenanceRecord** — synthetic-safe source references (`synthetic://` or `.example`)

## Separate assessment dimensions

Fit, confidence, freshness, completeness, and publication eligibility are distinct types. Phase 3 keeps fit at `unassessed` and formal completeness at `unknown`. No scores are computed.

Preview may show **Evidence-state coverage**: absolute counts of synthetic evidence records by `epistemicStatus`. That summary is not formal Completeness and must not be labeled Completeness.

## Synthetic “Verified”

The epistemic status `verified` remains part of the generic model. In Phase 3 synthetic data it means the record satisfies platform provenance/validation requirements inside the demo dataset — not that a real institution, event, source, or claim was independently verified.

## Fail-closed invariants

- Verified evidence requires validated provenance and non-unknown license
- Missing evidence cannot carry an observation value
- Inference is never publication-eligible
- Calculated evidence requires inputs or a descriptor
- Stale evidence preserves observation and reason
- Unknown license blocks publication eligibility

## Future PostgreSQL / RLS (not implemented)

Repository interfaces are designed so a PostgreSQL implementation can replace the synthetic store. Tenant isolation today is application-enforced. Production-grade isolation requires database RLS and is **not** claimed here.
