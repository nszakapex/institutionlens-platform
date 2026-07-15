# Phase 9 Batch 4 authenticated read policy model

**Status:** Migration `20260715200000` applied on staging project `qzidcqtaabubvtycstwy`; live catalog verifier 12/12; disposable two-tenant RLS attack-test gate executed 17/17 and cleaned.

## Principal → tenant binding

```text
auth.uid()
  -> institutionlens.memberships.user_id
  -> status = 'active'   (for tenant-scoped research access)
  -> tenant_id (+ role)
```

- Tenant identity is never taken from request bodies, query strings, or mutable JWT metadata.
- Helpers (`accessible_tenant_ids`, `own_membership_ids`, `active_member_has_roles`) are narrow `SECURITY DEFINER` functions with pinned `search_path = institutionlens, pg_catalog`, no dynamic SQL, and `EXECUTE` granted only to `authenticated`.
- Helpers return only the caller's own membership tenant/id/role facts; they are not broad RLS bypasses.

## Role → read classes

| DB membership role | Org directory | Publication-eligible research | Non-eligible / internal research | Restricted evidence/provenance | Provenance (any) | Overlays | Import runs | Audit | Memberships | Saved comparisons | Briefs                               |
| ------------------ | ------------- | ----------------------------- | -------------------------------- | ------------------------------ | ---------------- | -------- | ----------- | ----- | ----------- | ----------------- | ------------------------------------ |
| `owner`            | Yes           | Yes                           | Yes                              | Yes                            | Yes              | Yes      | Yes         | Yes   | Self only   | Own only          | Own + all approved                   |
| `analyst`          | Yes           | Yes                           | Yes                              | No                             | Non-restricted   | Yes      | Yes         | No    | Self only   | Own only          | Own + approved non-restricted        |
| `viewer`           | Yes           | Yes only                      | No                               | No                             | No               | No       | No          | No    | Self only   | Own only          | Approved `eligible` only (no drafts) |

Publication-eligible means `publication_eligibility = 'eligible'`. Viewers cannot read unpublished scores, assessment detail, or evidence detail merely because a sibling row is visible.

## Column security

- **No table-level `GRANT SELECT`** on InstitutionLens tables. Table-level SELECT would expose every column, including withheld ones.
- Every table uses an explicit column grant list.
- Withheld from `authenticated` (granted never; also explicitly revoked):
  - `provenance_records.private_notes`
  - `provenance_records.source_reference`
  - `organization_overlays.private_notes`
  - `memberships.user_id` (Auth UUID; self-binding uses RLS/`auth.uid()` only)

## Authenticated grant matrix

| Object                           | Privilege       | Permitted columns / notes                                                                                                                                                              |
| -------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| schema `institutionlens`         | `USAGE`         | —                                                                                                                                                                                      |
| `tenants`                        | column `SELECT` | `id`, `public_ref`, `display_name`, `status`, `data_classification`, `demo`, `created_at`, `updated_at`, `suspended_at`, `deletion_requested_at`                                       |
| `tenant_verticals`               | column `SELECT` | `id`, `tenant_id`, `vertical_id`, `adapter_version`, `status`, `created_at`, `updated_at`                                                                                              |
| `memberships`                    | column `SELECT` | `id`, `tenant_id`, `public_ref`, `role`, `status`, `invited_by_membership_id`, `invited_at`, `joined_at`, `suspended_at`, `removed_at`, `created_at`, `updated_at` (**not** `user_id`) |
| `organizations`                  | column `SELECT` | all columns except none withheld at grant layer (row access tenant-scoped)                                                                                                             |
| `import_runs`                    | column `SELECT` | all non-sequence columns listed in migration                                                                                                                                           |
| `provenance_records`             | column `SELECT` | all except `private_notes`, `source_reference`                                                                                                                                         |
| `evidence_records`               | column `SELECT` | all columns (row gates enforce publication/restricted)                                                                                                                                 |
| `evidence_dependencies`          | column `SELECT` | `id`, `tenant_id`, `organization_id`, `evidence_id`, `input_evidence_id`, `created_at`                                                                                                 |
| `assessment_runs`                | column `SELECT` | all columns (viewer rows require `eligible`)                                                                                                                                           |
| `assessment_results`             | column `SELECT` | all columns (viewer rows require `eligible`)                                                                                                                                           |
| `capability_results`             | column `SELECT` | all columns (viewer rows require `eligible`)                                                                                                                                           |
| `rule_results`                   | column `SELECT` | all columns (viewer rows require `eligible`)                                                                                                                                           |
| `rule_result_evidence`           | column `SELECT` | edge ids only; both evidence and rule_result must be visible under RLS                                                                                                                 |
| `organization_overlays`          | column `SELECT` | all except `private_notes`                                                                                                                                                             |
| `saved_comparisons`              | column `SELECT` | comparison metadata; self-owned rows only                                                                                                                                              |
| `saved_comparison_organizations` | column `SELECT` | edge columns; parent comparison must be visible                                                                                                                                        |
| `brief_snapshots`                | column `SELECT` | brief columns; own drafts or role-gated approved                                                                                                                                       |
| `audit_events`                   | column `SELECT` | redacted audit columns; owner only                                                                                                                                                     |
| helpers (3)                      | `EXECUTE`       | `accessible_tenant_ids`, `own_membership_ids`, `active_member_has_roles`                                                                                                               |

| Grantee         | Schema  | Tables                        | Functions             | Writes  |
| --------------- | ------- | ----------------------------- | --------------------- | ------- |
| `authenticated` | `USAGE` | column `SELECT` only as above | helper `EXECUTE` only | Revoked |
| `anon`          | Denied  | Denied                        | Denied                | Denied  |
| `PUBLIC`        | Denied  | Denied                        | Denied                | Denied  |
| `service_role`  | Denied  | Denied                        | Denied                | Denied  |

## Policies (18 SELECT)

Every core table has exactly one `FOR SELECT TO authenticated` policy named `<table>_select_authenticated`.

| Policy focus                   | Enforcement                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Tenant binding                 | `accessible_tenant_ids()` from `auth.uid()`                                                          |
| Memberships                    | `user_id = auth.uid()` only                                                                          |
| Restricted evidence/provenance | `access_classification <> 'restricted' OR owner`                                                     |
| Viewer research                | `publication_eligibility = 'eligible'` (and no provenance)                                           |
| Overlays / import              | owner or analyst                                                                                     |
| Audit                          | owner                                                                                                |
| Comparisons                    | `created_by_membership_id in own_membership_ids()`                                                   |
| Briefs                         | owner/analyst own drafts, or approved under role publication rules; viewers only approved `eligible` |
| Edge tables                    | `EXISTS` children visible under their RLS                                                            |

Same-organization lineage remains enforced by tenant-composite foreign keys.

## Viewer publication-safe allowlist

Static contract `VIEWER_PUBLICATION_SAFE_COLUMN_ALLOWLIST` in `scripts/phase-9-rls-policy-contract.ts` enumerates every table/column a viewer may reach. Migration grants on those tables must equal the allowlist. Viewer-denied tables (`import_runs`, `provenance_records`, `organization_overlays`, `audit_events`) have no viewer policy path. Publication-gated research tables require `publication_eligibility = 'eligible'` for viewers so role-wide column grants cannot expose unpublished scores or brief content.
