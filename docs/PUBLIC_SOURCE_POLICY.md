# Public-source and legal-use policy

**Phase:** 10  
**Status:** Binding for InstitutionLens ETL foundation  
**Related:** D-027; `docs/SOURCE_REGISTRY.md`; `docs/CLEAN_ROOM_POLICY.md`

## Purpose

Define when an institutional public source may enter the ETL boundary, what must be recorded, and what is forbidden. This policy protects legal use, tenant privacy, clean-room independence, and fail-closed operations.

## Allowed source classes (registry only)

Sources must be explicitly listed in the versioned source registry before any normalization occurs. Allowed **classes** for Phase 10 planning:

| Class             | Intended use                                            | Phase 10 executable?    |
| ----------------- | ------------------------------------------------------- | ----------------------- |
| `offline_fixture` | Deterministic local packs under `python/.../fixtures`   | Yes                     |
| `public_registry` | Official institutional registries (future)              | No (registry stub only) |
| `public_notice`   | Public institutional notices / filings mirrors (future) | No (registry stub only) |
| `public_website`  | First-party institutional websites (future)             | No (registry stub only) |

“Executable” means the offline CLI may process records. Future live classes remain non-executable until a separate owner-approved connector phase.

## Legal-use requirements

Before a source class becomes live-executable, operators must document:

1. **License / terms** — redistribution and research use permitted for InstitutionLens internal analysis, or explicit “unknown” (which blocks publication eligibility).
2. **Access method** — official bulk download, documented API, or manual operator export — not evasive scraping.
3. **Attribution** — `source_name` and withheld `source_reference` recorded server-side only.
4. **Robots / rate limits** — respected; no credential stuffing or ToS bypass.
5. **Personal data minimization** — do not ingest unnecessary personal data; prefer institutional facts.
6. **Clean-room** — no prohibited third-party research corpora (see `CLEAN_ROOM_POLICY.md`).

Phase 10 offline fixtures use synthetic `.example` labels and `synthetic_demo` license status only.

## Fail-closed rules

| Condition                                                                   | Required outcome                                                        |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Source id not in registry                                                   | Reject batch                                                            |
| Registry `live_fetch: true` in Phase 10 CLI                                 | Reject batch                                                            |
| License `unknown`                                                           | Evidence cannot be `eligible`; prefer `review_required` or `restricted` |
| Ambiguous organization match                                                | Human review queue — do not invent org ids                              |
| Restricted access classification                                            | Review queue; empty safe search text in future persistence              |
| Network URL that is not an offline fixture URI (`fixture://` or `.example`) | Reject                                                                  |
| Missing checksum / idempotency key                                          | Reject                                                                  |
| Attempt to alter Phase 4 scores                                             | Reject (ETL never scores)                                               |

## Privacy and wire boundary

ETL outputs may include server-only provenance fields (`source_reference`, internal notes) in **import candidate** artifacts destined for privileged write paths. Those fields must never be copied into:

- application view models;
- client bundles;
- logs or diagnostics summaries;
- authenticated RPC wire projections.

Raw database UUID primary keys must not appear in candidate public surfaces. Domain ids (`org_…`, `ev_…`, `prov_…`) and opaque public refs remain the only external identifiers.

## No investment advice

Normalized observations describe institutional facts and research context only. Copy and titles must not recommend buy/sell/hold or imply suitability for investment decisions.

## Operator duties

- Keep registry `policy_version` aligned with this document’s revision.
- Record import runs with checksum + idempotency (schema: `import_runs`) when persistence exists.
- Route uncertain or restricted material to human review before any future publish-eligible state.
