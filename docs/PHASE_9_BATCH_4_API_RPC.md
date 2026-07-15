# Phase 9 Batch 4 narrow read API/RPC surface

**Status:** Applied on staging (`qzidcqtaabubvtycstwy`). Migration `20260715210000_phase9_narrow_read_api_rpc.sql` is live; authenticated SDK transport and app cutover remain deferred. Synthetic local-demo remains the active application runtime.

**Depends on:** Applied core schema + authenticated read RLS (`20260713190000`, `20260715181000`, `20260715200000`).

## Security model

| Rule           | Requirement                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema         | Separate `institutionlens_api` schema; core `institutionlens` tables are not the app transport                                              |
| Privilege      | `USAGE` on `institutionlens_api` + `EXECUTE` on listed RPCs for `authenticated` only                                                        |
| Denied         | `PUBLIC`, `anon`, and `service_role` EXECUTE; no table grants in the API schema                                                             |
| Invoker        | All RPCs are `SECURITY INVOKER` so core RLS still applies                                                                                   |
| Parameters     | Bounded, typed arguments only; no dynamic SQL                                                                                               |
| Tenant binding | Every public RPC takes server-bound `p_tenant_public_ref`, verified against `accessible_tenant_ids()`; no client tenant/domain ID selection |
| Projection     | Opaque refs / domain `source_key` ids only; never raw UUID PKs, `private_notes`, `source_reference`, or `memberships.user_id`               |
| Decode         | Wire `tenantPublicRef` validated against session binding, then stripped; domain `tenantId` stamped server-side only                         |
| Partial cover  | Unsupported gateway ops fail closed with `UNSUPPORTED_OPERATION`; no production→synthetic fallback                                          |
| Writes         | None                                                                                                                                        |

## RPC surface (this slice)

| Gateway operation               | Postgres function                         | Purpose                                       |
| ------------------------------- | ----------------------------------------- | --------------------------------------------- |
| `organizations.getByPublicRef`  | `organizations_get_by_public_ref`         | Organization by `oref_`                       |
| `organizations.getById`         | `organizations_get_by_domain_id`          | Organization by domain `source_key` (`org_…`) |
| `organizations.list`            | `organizations_list`                      | Bounded organization page                     |
| `organizations.count`           | `organizations_count`                     | Organization count                            |
| `evidence.listByOrganization`   | `evidence_list_by_organization_domain_id` | Evidence page for one organization            |
| `comparisons.getByPublicRef`    | `comparisons_get_by_public_ref`           | Saved comparison by `cref_`                   |
| `comparisons.list`              | `comparisons_list`                        | Bounded comparison page                       |
| `briefSnapshots.getByPublicRef` | `brief_snapshots_get_by_public_ref`       | Brief snapshot by `bsref_`                    |
| `briefSnapshots.list`           | `brief_snapshots_list`                    | Bounded brief page                            |

All nine functions take `p_tenant_public_ref` as the first argument (from the server session binding, never from client query input).

Deferred to later Batch 4/5 slices: workspace, provenance, capabilities, assessments, portfolios, overlays, and SDK transport.

## Live-row decoders

Server-only decoders in `src/repositories/supabase-postgres/live-row-decoders.ts`:

- reject null/malformed/extra-sensitive/unbounded wire payloads;
- reject raw UUIDs and withheld private-note / Auth identity keys;
- require `LiveTenantBinding` (`tenantId` + `tenantPublicRef`) from the authenticated context;
- validate wire `tenantPublicRef` against that binding, reject mixed-tenant pages, then strip the discriminator and stamp domain `tenantId`;
- map into existing repository/domain records without Phase 4 recalculation;
- preserve restricted-evidence and brief-content rejection in the production adapter.

## Partial-coverage fail-closed behavior

`OperationRunner` admits only `NARROW_READ_GATEWAY_OPERATIONS`. Deferred operations throw `RepositoryError("UNSUPPORTED_OPERATION")` before any gateway call. Production adapters do not import or call synthetic loaders.

## Local validation

- Static contract: `scripts/phase-9-api-rpc-contract.ts`
- Decoder/unit tests: `src/repositories/supabase-postgres/live-row-decoders.test.ts`
- Security contract: `src/repositories/supabase-postgres/narrow-read-security.contract.test.ts`
- Rollback artifact: `supabase/rollback/20260715210000_phase9_narrow_read_api_rpc.sql`

## Live-validation status

1. Applied `20260715210000` on disposable staging after owner approval.
2. SELECT-only live verifier checks API schema USAGE/EXECUTE posture (`api_rpc_privileges`; authenticated-only; anon/service_role denied).
3. Remaining: bind authenticated gateway transport and replay repository contract tests against staging with disposable fixtures.
4. Keep synthetic local-demo as the default app path until Batch 5 cutover.
