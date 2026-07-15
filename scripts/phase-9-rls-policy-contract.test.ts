import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  AUTHENTICATED_COLUMN_GRANT_MATRIX,
  EXPECTED_SELECT_POLICIES,
  PHASE_9_RLS_MIGRATION_PATH,
  PHASE_9_RLS_MIGRATION_VERSION,
  PHASE_9_RLS_ROLLBACK_PATH,
  VIEWER_DENIED_TABLES,
  VIEWER_PUBLICATION_SAFE_COLUMN_ALLOWLIST,
  parseColumnGrants,
  readAndValidatePhase9RlsPolicies,
  validateAuthenticatedColumnGrantMatrix,
  validatePhase9RlsMigration,
  validatePhase9RlsRollback,
  validateViewerPublicationSafeAllowlist,
} from "./phase-9-rls-policy-contract";
import { CORE_TABLES } from "./phase-9-schema-contract";
import {
  PHASE_9_CORRECTIVE_MIGRATION_VERSION,
  PRIVILEGED_API_ROLE,
} from "./phase-9-schema-contract";

const migration = fs.readFileSync(PHASE_9_RLS_MIGRATION_PATH, "utf8");
const rollback = fs.readFileSync(PHASE_9_RLS_ROLLBACK_PATH, "utf8");

describe("Phase 9 authenticated read RLS policy contract", () => {
  it("passes the complete RLS migration and rollback contract", () => {
    expect(readAndValidatePhase9RlsPolicies()).toEqual([]);
    expect(PHASE_9_RLS_MIGRATION_VERSION > PHASE_9_CORRECTIVE_MIGRATION_VERSION).toBe(true);
    expect(EXPECTED_SELECT_POLICIES).toHaveLength(18);
  });

  it("enforces an explicit viewer publication-safe table/column allowlist", () => {
    expect(validateViewerPublicationSafeAllowlist(migration)).toEqual([]);
    expect(validateAuthenticatedColumnGrantMatrix(migration)).toEqual([]);
    expect(Object.keys(AUTHENTICATED_COLUMN_GRANT_MATRIX).sort()).toEqual([...CORE_TABLES].sort());
    const grants = parseColumnGrants(
      migration
        .replace(/--[^\r\n]*/g, " ")
        .replace(/\s+/g, " ")
        .toLowerCase(),
    );
    for (const [table, columns] of Object.entries(AUTHENTICATED_COLUMN_GRANT_MATRIX)) {
      expect(grants.get(table)).toEqual([...columns].sort());
    }
    for (const [table, columns] of Object.entries(VIEWER_PUBLICATION_SAFE_COLUMN_ALLOWLIST)) {
      expect(grants.get(table)).toEqual([...columns].sort());
    }
    for (const table of VIEWER_DENIED_TABLES) {
      expect(VIEWER_PUBLICATION_SAFE_COLUMN_ALLOWLIST[table]).toBeUndefined();
      expect(AUTHENTICATED_COLUMN_GRANT_MATRIX[table]?.length).toBeGreaterThan(0);
    }

    const extraColumn = migration.replace(
      "archived_at\n) on table institutionlens.organizations to authenticated;",
      "archived_at,\n  secret_field\n) on table institutionlens.organizations to authenticated;",
    );
    expect(validateViewerPublicationSafeAllowlist(extraColumn)).toContain(
      "Viewer allowlist mismatch for organizations: granted columns must equal the publication-safe allowlist.",
    );

    const viewerProvenance = migration.replace(
      "and institutionlens.active_member_has_roles(tenant_id, array['owner', 'analyst']::text[])\n    and (\n      access_classification <> 'restricted'",
      "and (\n      institutionlens.active_member_has_roles(tenant_id, array['viewer']::text[])\n      or institutionlens.active_member_has_roles(tenant_id, array['owner', 'analyst']::text[])\n    )\n    and (\n      access_classification <> 'restricted'",
    );
    expect(validateViewerPublicationSafeAllowlist(viewerProvenance)).toContain(
      "Viewer-denied table provenance_records must not include a viewer role allow path.",
    );

    const viewerDrafts = migration.replace(
      `created_by_membership_id in (select institutionlens.own_membership_ids())
        and institutionlens.active_member_has_roles(tenant_id, array['owner', 'analyst']::text[])`,
      `created_by_membership_id in (select institutionlens.own_membership_ids())`,
    );
    expect(validateViewerPublicationSafeAllowlist(viewerDrafts)).toContain(
      "Brief drafts must be owner/analyst creator-scoped only; viewers cannot read unpublished brief content.",
    );
  });

  it("rejects omitting a table SELECT policy", () => {
    const weakened = migration.replace(
      /create policy audit_events_select_authenticated[\s\S]*?;/,
      "",
    );
    expect(validatePhase9RlsMigration(weakened)).toEqual(
      expect.arrayContaining([
        "Missing SELECT policy: audit_events_select_authenticated.",
        "RLS migration must define exactly 18 SELECT policies.",
      ]),
    );
  });

  it("rejects cross-tenant or client-supplied tenant predicates", () => {
    const weakened = migration.replaceAll(
      "memberships.user_id = (select auth.uid())",
      "memberships.tenant_id = nullif(current_setting('request.jwt.claim.tenant_id', true), '')::uuid",
    );
    expect(validatePhase9RlsMigration(weakened)).toEqual(
      expect.arrayContaining([
        "RLS migration must resolve tenants from memberships.user_id = auth.uid().",
        "RLS migration must not derive tenant identity from JWT claims or settings.",
      ]),
    );
  });

  it("rejects permissive true predicates and write policies", () => {
    expect(
      validatePhase9RlsMigration(
        migration.replace(
          "using (id in (select institutionlens.accessible_tenant_ids()))",
          "using (true)",
        ),
      ),
    ).toContain("RLS migration must not use permissive true predicates.");

    expect(
      validatePhase9RlsMigration(
        `${migration.replace(
          "commit;",
          "create policy bad_write on institutionlens.tenants for insert to authenticated with check (true);\ncommit;",
        )}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "RLS migration must not create write or FOR ALL policies.",
        "RLS migration must not use permissive true predicates.",
      ]),
    );
  });

  it("rejects direct public/anon/privileged-role grants or policy targets", () => {
    expect(
      validatePhase9RlsMigration(
        migration.replace(
          "grant usage on schema institutionlens to authenticated;",
          "grant usage on schema institutionlens to anon;",
        ),
      ),
    ).toContain(
      `RLS migration must not grant privileges to public, anon, or ${PRIVILEGED_API_ROLE}.`,
    );

    expect(
      validatePhase9RlsMigration(
        migration.replace(
          "to authenticated\n  using (id in (select institutionlens.accessible_tenant_ids()));",
          "to anon\n  using (id in (select institutionlens.accessible_tenant_ids()));",
        ),
      ),
    ).toContain(
      `RLS migration must not target public, anon, or ${PRIVILEGED_API_ROLE} in policies.`,
    );
  });

  it("rejects table-level SELECT grants and withheld-column exposure", () => {
    expect(
      validatePhase9RlsMigration(
        migration.replace(
          "grant select (\n  id,\n  public_ref,",
          "grant select on table institutionlens.tenants to authenticated;\ngrant select (\n  id,\n  public_ref,",
        ),
      ),
    ).toContain(
      "RLS migration must not use table-level SELECT grants; use explicit column grants only.",
    );

    const withNotes = migration.replace(
      "updated_at\n) on table institutionlens.provenance_records to authenticated;",
      "updated_at,\n  private_notes\n) on table institutionlens.provenance_records to authenticated;",
    );
    expect(validatePhase9RlsMigration(withNotes)).toContain(
      "RLS migration must not grant select on provenance_records.private_notes.",
    );

    const withSourceRef = migration.replace(
      "source_name,\n  retrieved_at,",
      "source_name,\n  source_reference,\n  retrieved_at,",
    );
    expect(validatePhase9RlsMigration(withSourceRef)).toContain(
      "RLS migration must not grant select on provenance_records.source_reference.",
    );

    const withMembershipUser = migration.replace(
      "public_ref,\n  role,",
      "public_ref,\n  user_id,\n  role,",
    );
    expect(validatePhase9RlsMigration(withMembershipUser)).toContain(
      "RLS migration must not grant select on memberships.user_id.",
    );
  });

  it("rejects missing restricted, overlay, viewer, and self-only gates", () => {
    expect(
      validatePhase9RlsMigration(
        migration.replaceAll("access_classification <> 'restricted'", "true"),
      ),
    ).toContain("RLS migration must gate restricted evidence/provenance rows.");

    expect(
      validatePhase9RlsMigration(
        migration.replaceAll("publication_eligibility = 'eligible'", "true"),
      ),
    ).toContain("RLS migration must constrain viewer research reads to publication-eligible rows.");

    expect(
      validatePhase9RlsMigration(
        migration.replace(
          "using (user_id = (select auth.uid()));",
          "using (tenant_id in (select institutionlens.accessible_tenant_ids()));",
        ),
      ),
    ).toContain("RLS migration must keep memberships self-only via auth.uid().");

    expect(
      validatePhase9RlsMigration(
        migration.replaceAll(
          "created_by_membership_id in (select institutionlens.own_membership_ids())",
          "true",
        ),
      ),
    ).toContain("RLS migration must keep creator-scoped tables bound to own_membership_ids().");
  });

  it("rejects an incomplete rollback that would reopen privileges", () => {
    expect(validatePhase9RlsRollback(rollback.replace("DESTRUCTIVE", "CAUTION"))).toContain(
      "RLS rollback must carry an explicit DESTRUCTIVE warning.",
    );
    expect(
      validatePhase9RlsRollback(rollback.replace(/drop policy if exists audit_events[^\n]*\n/, "")),
    ).toContain("RLS rollback must drop audit_events_select_authenticated.");
    expect(
      validatePhase9RlsRollback(
        rollback.replace(/drop function if exists institutionlens.own_membership_ids\(\);\n/, ""),
      ),
    ).toContain("RLS rollback must drop own_membership_ids helper.");
    expect(
      validatePhase9RlsRollback(
        `${rollback.replace("commit;", "grant usage on schema institutionlens to anon;\ncommit;")}`,
      ),
    ).toContain("RLS rollback must not grant privileges (deny-all restore only).");
  });
});
