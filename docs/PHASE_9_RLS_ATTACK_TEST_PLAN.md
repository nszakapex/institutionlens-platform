# Phase 9 live two-tenant RLS attack-test plan

**Status:** Prepared for the later external gate. Not executed in Batch 4 preparation.

**Depends on:** Applied migration `20260715200000_phase9_authenticated_read_rls.sql`, Supabase Auth users, and active `institutionlens.memberships` rows for both tenants.

## Principal binding under test

| Fact           | Required behavior                                                                         |
| -------------- | ----------------------------------------------------------------------------------------- |
| Identity       | `auth.uid()` only                                                                         |
| Tenant binding | `memberships.user_id = auth.uid()` and `status = 'active'`                                |
| Forbidden      | Client-supplied tenant IDs, mutable JWT tenant claims, `current_setting` tenant overrides |

## Fixtures

Create two tenants (`T1`, `T2`) with no shared memberships.

| User | Tenant | Membership role | App permission analogue        |
| ---- | ------ | --------------- | ------------------------------ |
| U1   | T1     | `owner`         | administrator-equivalent reads |
| U2   | T1     | `analyst`       | analyst reads (no restricted)  |
| U3   | T1     | `viewer`        | publication-safe reads only    |
| U4   | T2     | `owner`         | cross-tenant counterpart       |
| U5   | none   | —               | authenticated but unscoped     |

Seed minimal rows in both tenants: organizations; evidence with `eligible`, `internal_only`, and `restricted` access/publication combinations; provenance including `private_notes` and `source_reference`; overlays including `private_notes`; assessment runs/results/capability/rule rows across publication states; U1-owned and U2-owned comparisons; draft and approved briefs; import run; audit event.

## Cases (must all pass)

1. **Own-tenant allow (U1/U2/U3 on T1):** SELECT succeeds for permitted tables/rows under each role.
2. **Cross-tenant deny (U1 → T2, U4 → T1):** zero rows; no existence leakage via errors that encode the other tenant’s identifiers.
3. **Unscoped deny (U5):** zero rows on every InstitutionLens table.
4. **anon / PUBLIC deny:** no schema usage and no table SELECT.
5. **service_role request path deny:** no InstitutionLens grants; request-path client must not read core tables even if RLS bypass attributes exist on the role elsewhere.
6. **Restricted evidence:** U1 sees restricted rows; U2/U3 do not; denied callers receive empty results, not restricted payloads.
7. **Overlay:** U1/U2 see overlay rows (without `private_notes` column privilege); U3 sees none.
8. **Private notes / source_reference / memberships.user_id:** `authenticated` cannot `SELECT` these columns (privilege failure), including via `SELECT *`.
9. **Viewer publication gate:** U3 cannot read `internal_only` / `review_required` / non-`eligible` assessment, capability, rule, or evidence rows; U3 cannot read any provenance rows.
10. **Identity exposure:** U2/U3 see only their own `memberships` row and cannot read `user_id`; cannot list coworker memberships, roles, or Auth UUIDs.
11. **Self-owned workspace objects:** U2 cannot read U1’s saved comparisons (or their org edges); comparison org edges do not leak foreign comparisons.
12. **Approved brief sharing:** U3 can read approved + `eligible` briefs created by others; U3 cannot read any drafts (including own) or non-eligible approved briefs.
13. **Write deny:** INSERT/UPDATE/DELETE/TRUNCATE as U1–U4 fail on every core table.
14. **Lineage containment:** dependency / rule-evidence edges involving restricted or non-visible evidence are invisible to U2/U3.
15. **Disabled principal:** membership `status = 'suspended'` or `'removed'` yields zero tenant research access even with a valid Auth user (own membership row may still be self-visible).
16. **JWT spoof resistance:** forged claims naming `T2` while authenticated as U1 never expand access beyond T1 memberships.
17. **No table-level SELECT override:** catalog shows no table-level `SELECT` ACL for `authenticated` on InstitutionLens relations (column grants only).

## Execution notes

- Run as discrete authenticated sessions (one JWT / role per case).
- Prefer SQL assertions that count rows and probe forbidden columns; do not print secrets or raw customer payloads into logs.
- Application-layer permission checks remain mandatory after RLS passes.
- This plan does not authorize Auth configuration, seed of real customer data, or production cutover.
