# Phase 3 — Domain foundation

**Status:** Implementation  
**Depends on:** Phase 0–2 (governance, secure foundation, design system)  
**Does not include:** Scoring, explorer UI, real auth, database, ingestion, briefs, exports, or Phase 4 product pages

## Goal

Establish the trustworthy domain core that every future InstitutionLens vertical and product surface depends on:

1. Generic organization modeling
2. Tenant-safe access boundaries
3. Versioned vertical-adapter contracts
4. Evidence and provenance modeling
5. Separate fit, confidence, freshness, completeness, and publication concepts
6. Deterministic synthetic `financial_institutions` adapter with exactly 24 fictional organizations
7. Schema validation at every untrusted boundary
8. Automated tests for isolation and invariants

## Non-goals

- Real fit-score calculation, weights, thresholds, or ranking
- Real evidence ingestion or external network
- PostgreSQL / Supabase / ORM
- Real authentication or customer onboarding
- Brief generation, exports, background jobs, AI content
- Coverage / AD&Co material of any kind
- Production deployment or telemetry

## Module map

| Area                                                         | Location                                |
| ------------------------------------------------------------ | --------------------------------------- |
| Identifiers, schemas, errors, clock, invariants, view models | `src/domain/`                           |
| Authorization context and explicit actions                   | `src/authorization/`                    |
| Organization repository interface + synthetic impl           | `src/repositories/`                     |
| Vertical contract, allowlisted registry                      | `src/verticals/`                        |
| Financial-institutions adapter + fixtures                    | `src/verticals/financial-institutions/` |
| Thin read services                                           | `src/application/`                      |

**Dependency direction:** verticals may import domain contracts; domain never imports a specific vertical. Generic core never imports `financial-institutions`.

## Versions (separate fields)

| Version field             | Phase 3 value | Purpose                                             |
| ------------------------- | ------------- | --------------------------------------------------- |
| Domain schema version     | `1.0.0`       | Generic Organization / Evidence / Provenance shapes |
| Adapter version           | `1.0.0`       | `financial_institutions` payload + vocabulary       |
| Fixture / dataset version | `1.0.0`       | Deterministic synthetic seed                        |
| Rule-set version          | _deferred_    | Future scoring rules only                           |

Stored records retain the adapter version used at validation time. Registry lookup never falls back to “latest.”

## Authorization

- Server-only demo principal (`getDemoPrincipal`) remains the gate for app routes and health.
- Domain reads use `AuthorizationContext` derived from that gate — never from URL or client state.
- Demo analyst receives minimum read permissions: `organization:read`, `evidence:read`, `methodology:read`.
- Mutation actions are defined but unused.
- Fail closed on missing context, suspended tenant/principal, or missing permission.

## Synthetic dataset

- Exactly **24** fictional financial institutions for `tenant_demo_research`
- Stable prefixed IDs (`org_syn_fi_001` …)
- Categorical bands only — no realistic dollar figures or regulatory IDs
- Explicit missing / stale / partial / restricted evidence cases
- Fit remains `unassessed` for every organization
- Dataset declaration: entirely synthetic; architecture and interface validation only

## UI integration (minimal)

Foundation preview shows aggregate domain status only:

- Adapter registered (safe language)
- Organization count (24)
- Fit unassessed
- Evidence state variety counts
- No raw tenant IDs, provenance internals, or explorer/dashboard UX

## Verification

`npm run format:check`, `lint`, `typecheck`, `test`, `test:security`, `test:domain`, `validate:synthetic`, scans, `build`, `verify`.
