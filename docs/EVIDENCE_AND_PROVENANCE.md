# Evidence and provenance

**Phase:** 6  
**Route:** `/evidence`  
**Data status:** deterministic synthetic demo only

## Purpose

The evidence catalog provides authorized, tenant-scoped evidence and provenance views. It supports text search, typed multi-select filters, organization scoping by `OrganizationPublicRef`, and page sizes of 20 or 40. The UI consumes a redacted application view model; it never loads fixtures directly.

This is an in-memory synthetic catalog for the default local-demo app. Phase 10 adds an **offline** public-source ETL foundation (`python/institutionlens_etl`, `src/ingestion`) that emits import candidates and review-queue items from fixtures only. Live acquisition, privileged persistence into `import_runs`, and product-route wiring remain deferred.

## Authorization and tenant boundary

`evidence:read` is required for the catalog. `evidence:restricted_read` is an additional permission granted only to administrators in the current role policy.

| Role          | Evidence | Restricted evidence   | Provenance derived from restricted evidence |
| ------------- | -------- | --------------------- | ------------------------------------------- |
| Analyst       | Read     | Placeholder only      | Withheld                                    |
| Reviewer      | Read     | Placeholder only      | Withheld                                    |
| Administrator | Read     | Safe available fields | Visible when linked and otherwise eligible  |

The service derives the tenant from `AuthorizationContext`; query parameters cannot override it. Evidence and provenance are filtered by `context.tenant.id`, and an organization reference can narrow only organizations already present in the tenant read model. A cross-tenant reference returns zero rows rather than broadening the query.

## Restricted evidence semantics

Without `evidence:restricted_read`, a restricted row exposes only:

- the fixed title “Restricted evidence”;
- organization display name and safe public detail link;
- evidence type;
- freshness, confidence, and restricted publication state;
- the synthetic marker.

The summary, observation, source name, dates, and internal identifiers are withheld. Text search over restricted rows uses only organization display name and evidence type, so hidden summaries cannot be used as a search oracle. Provenance rows linked only through unreadable restricted evidence are omitted.

Restricted does not mean missing, stale, invalid, or untrusted. It is an access/publication classification. The assessment ledger may separately record `not_evaluated_restricted` where restricted evidence is unavailable for scoring.

## Missing and stale semantics

- **Missing:** no observation value is fabricated. Required missing evidence produces a not-evaluated outcome or an unsatisfied gate, not negative alignment.
- **Stale:** the original observation and dates remain visible when authorized. Each executable rule decides whether stale evidence can contribute. The detail UI records stale-evidence limitations and recommends review before publication.
- **Unknown freshness:** remains unknown; it is never converted to current.
- **Insufficient evidence:** suppresses numeric scores and bands where assessment requirements are not met.

## Catalog query

`evidence-catalog-query.ts` validates a strict query model:

- view: evidence or provenance;
- text up to 100 characters;
- evidence type, epistemic status, freshness, confidence, publication eligibility;
- capability and rule outcome;
- effective/reporting period category;
- source type, validation status, license status, access classification;
- synthetic status;
- optional organization public reference;
- page at least 1 and page size 20 or 40.

Values are normalized and bounded. Unsupported parameters are reported and ignored; they do not expand tenant scope. Filters use OR within each selected group and AND across groups. Out-of-range pages return an empty recovery state.

## Provenance presentation

Visible provenance fields include source name/type, validation status, license status, access classification, retrieved/published/reporting dates, and synthetic status. Organization detail also reports whether a synthetic checksum was recorded. Raw source references and provenance IDs are not serialized.

“Validated” refers only to the synthetic provenance rules in this repository. It is not a claim that a real source or organization was independently verified.

## Lineage role

Evidence links a provenance record to one or more ledger entries. Application services derive safe rule titles and capability names from those joins. See `DATA_LINEAGE.md` for the complete Source → Provenance → Evidence → Rule → Capability → Portfolio chain and its redaction behavior.

## Current limitations and PostgreSQL needs

Filtering, association building, sorting, and pagination currently occur after loading synthetic arrays. The total result set is materialized before slicing. This is suitable for fixture validation only and makes no production performance claim.

A PostgreSQL implementation should push authorization, filtering, ordering, and pagination into SQL. Likely indexes include:

- `evidence(tenant_id, organization_id, publication_eligibility)`;
- `evidence(tenant_id, evidence_type, freshness, confidence)`;
- date indexes for observed/effective periods;
- full-text or trigram indexing over publication-safe searchable fields only;
- join indexes from ledger evidence references to capability/rule outcomes;
- `provenance(tenant_id, source_type, validation_status, license_status, access_classification)`;
- stable cursor keys for deterministic pagination.

Restricted content must use separate searchable columns or predicates so unauthorized text search cannot infer hidden values. Query plans, row counts, payload budgets, and pagination behavior require measurement against representative data.

## Code and tests

- `src/application/evidence-catalog-query.ts`
- `src/application/evidence-catalog-service.ts`
- `src/application/evidence-catalog-view-models.ts`
- `src/application/evidence-catalog-service.test.ts`
- `src/components/evidence/EvidenceCatalogPage.tsx`
