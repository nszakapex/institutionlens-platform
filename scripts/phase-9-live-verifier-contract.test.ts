import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PHASE_9_CORRECTIVE_MIGRATION_PATH,
  PHASE_9_CORRECTIVE_MIGRATION_VERSION,
  PHASE_9_INITIAL_MIGRATION_VERSION,
  PHASE_9_MIGRATION_PATH,
} from "./phase-9-schema-contract";
import {
  PHASE_9_LIVE_VERIFIER_PATH,
  readAndValidatePhase9LiveVerifier,
  validatePhase9CorrectiveMigrationPresence,
  validatePhase9LiveVerifier,
} from "./phase-9-live-verifier-contract";

const verifier = fs.readFileSync(PHASE_9_LIVE_VERIFIER_PATH, "utf8");
const migration = fs.readFileSync(PHASE_9_MIGRATION_PATH, "utf8");
const correctiveMigration = fs.readFileSync(PHASE_9_CORRECTIVE_MIGRATION_PATH, "utf8");
const supabaseConfig = fs.readFileSync("supabase/config.toml", "utf8");
const supabaseIgnore = fs.readFileSync("supabase/.gitignore", "utf8");

describe("Phase 9 live schema verifier contract", () => {
  it("passes the complete SELECT-only verifier contract", () => {
    expect(readAndValidatePhase9LiveVerifier()).toEqual([]);
  });

  it("rejects mutating SQL", () => {
    const weakened = verifier.replace(
      "select check_name, passed, expected_value, actual_value",
      "delete from institutionlens.tenants; select check_name, passed, expected_value, actual_value",
    );
    expect(validatePhase9LiveVerifier(weakened, migration)).toContain(
      "Live verifier must not contain a mutating or administrative SQL command.",
    );
  });

  it("rejects a missing Phase 9 table", () => {
    const weakened = verifier.replace("    ('audit_events')\n", "");
    expect(validatePhase9LiveVerifier(weakened, migration)).toContain(
      "Live verifier table set must match the 18 Phase 9 migration tables.",
    );
  });

  it("rejects an extra Phase 9 table", () => {
    const weakened = verifier.replace(
      "    ('audit_events')\n),",
      "    ('audit_events'),\n    ('unexpected_table')\n),",
    );
    expect(validatePhase9LiveVerifier(weakened, migration)).toContain(
      "Live verifier table set must match the 18 Phase 9 migration tables.",
    );
  });

  it("rejects a missing required index", () => {
    const weakened = verifier.replace("    ('audit_events_retention_idx')\n", "");
    expect(validatePhase9LiveVerifier(weakened, migration)).toContain(
      "Live verifier index set must match the committed migration.",
    );
  });

  it("rejects an extra index", () => {
    const weakened = verifier.replace(
      "    ('audit_events_retention_idx')\n),",
      "    ('audit_events_retention_idx'),\n    ('unexpected_index')\n),",
    );
    expect(validatePhase9LiveVerifier(weakened, migration)).toContain(
      "Live verifier index set must match the committed migration.",
    );
  });

  it("rejects a missing tenant-composite foreign key", () => {
    const weakened = verifier.replace(
      "    ('audit_events_actor_fk|audit_events|tenant_id,actor_membership_ref|memberships|tenant_id,public_ref')\n",
      "",
    );
    expect(validatePhase9LiveVerifier(weakened, migration)).toContain(
      "Live verifier foreign-key set must match the committed migration.",
    );
  });

  it("rejects an extra foreign key", () => {
    const weakened = verifier.replace(
      "    ('audit_events_actor_fk|audit_events|tenant_id,actor_membership_ref|memberships|tenant_id,public_ref')\n),",
      "    ('audit_events_actor_fk|audit_events|tenant_id,actor_membership_ref|memberships|tenant_id,public_ref'),\n    ('unexpected_foreign_key|audit_events|tenant_id,other_id|memberships|tenant_id,id')\n),",
    );
    expect(validatePhase9LiveVerifier(weakened, migration)).toContain(
      "Live verifier foreign-key set must match the committed migration.",
    );
  });

  it("rejects non-lineage foreign-key column drift", () => {
    const weakened = verifier.replace(
      "memberships_inviter_fk|memberships|tenant_id,invited_by_membership_id|memberships|tenant_id,id",
      "memberships_inviter_fk|memberships|tenant_id,invited_by_membership_id|memberships|tenant_id,public_ref",
    );
    expect(validatePhase9LiveVerifier(weakened, migration)).toContain(
      "Live verifier foreign-key set must match the committed migration.",
    );
  });

  it("rejects lineage columns that drift from the committed migration", () => {
    const weakened = verifier.replace(
      "array['tenant_id', 'organization_id', 'vertical_id']::text[]",
      "array['tenant_id', 'organization_id']::text[]",
    );
    expect(validatePhase9LiveVerifier(weakened, migration)).toContain(
      "Live verifier lineage columns must match the migration: evidence_records_organization_fk.",
    );
  });

  it("rejects a relaxed policy-count gate", () => {
    const weakened = verifier.replace("value = 18", "value >= 0");
    expect(validatePhase9LiveVerifier(weakened, migration)).toContain(
      "Live verifier must require exactly 18 authenticated SELECT policies with shape checks.",
    );
  });

  it("rejects a privilege source removed from the pass condition", () => {
    const weakened = verifier.replace(
      "      + (select count(*) from default_acl_violations)\n",
      "",
    );
    expect(validatePhase9LiveVerifier(weakened, migration)).toContain(
      "Live verifier must fail closed on unauthorized API-role privileges.",
    );
  });

  it("rejects dropping the exact column-grant matrix or treating partial grants as enough", () => {
    const withoutMatrix = verifier
      .replace(/column_grant_matrix_violations/g, "relation_acl_violations")
      .replace("expected_column_grants", "expected_column_grants_removed");
    expect(validatePhase9LiveVerifier(withoutMatrix, migration)).toEqual(
      expect.arrayContaining([
        "Live verifier must enforce the exact authenticated column-grant matrix (missing and extra grants fail).",
      ]),
    );

    const withWithheld = verifier.replace(
      "('provenance_records', 'source_name')",
      "('provenance_records', 'source_name'),\n    ('provenance_records', 'private_notes')",
    );
    expect(validatePhase9LiveVerifier(withWithheld, migration)).toContain(
      "Live verifier column-grant matrix must not include withheld provenance_records.private_notes.",
    );
  });

  it("rejects an omitted API role", () => {
    const weakened = verifier.replace(
      /values \('anon'\), \('authenticated'\), \('service_[a-z]+'\)/,
      "values ('anon'), ('authenticated')",
    );
    expect(validatePhase9LiveVerifier(weakened, migration)).toContain(
      "Live verifier must check every API role revoked by the migration.",
    );
  });

  it("rejects nonzero application rows", () => {
    const weakened = verifier.replace("disposable staging fixtures allowed", "must be empty");
    expect(validatePhase9LiveVerifier(weakened, migration)).toContain(
      "Live verifier must allow disposable staging Auth fixtures in application_row_count.",
    );
  });

  it("rejects a missing exact zero-row probe", () => {
    const weakened = verifier.replace(
      "    union all select 1 from institutionlens.audit_events\n",
      "",
    );
    expect(validatePhase9LiveVerifier(weakened, migration)).toContain(
      "Live verifier may reference audit_events only through its bounded zero-row probe.",
    );
  });

  it("rejects additional or substituted migration history", () => {
    const weakened = verifier.replace(
      "total_count = 7 and expected_count = 7 and unexpected_count = 0",
      "expected_count = 7",
    );
    expect(validatePhase9LiveVerifier(weakened, migration)).toContain(
      "Live verifier must require exactly the seven Phase 9 migrations and reject extras.",
    );
  });

  it("rejects a pre-overlay-column-safe migration history expectation", () => {
    const weakened = verifier
      .replace(
        "total_count = 7 and expected_count = 7 and unexpected_count = 0",
        "total_count = 6 and expected_count = 6 and unexpected_count = 0",
      )
      .replace("    ('20260716231000')\n", "");
    expect(validatePhase9LiveVerifier(weakened, migration)).toEqual(
      expect.arrayContaining([
        "Live verifier must require migration version 20260716231000.",
        "Live verifier must require exactly the seven Phase 9 migrations and reject extras.",
        "Live verifier must not accept pre-overlay-column-safe migration history expectations.",
      ]),
    );
  });

  it("rejects omitting the overlay-column-safe migration version from history", () => {
    const weakened = verifier.replace("    ('20260716231000')\n", "");
    expect(validatePhase9LiveVerifier(weakened, migration)).toContain(
      "Live verifier must require migration version 20260716231000.",
    );
  });

  it("requires the corrective migration timestamp to sort after the initial schema migration", () => {
    expect(PHASE_9_CORRECTIVE_MIGRATION_VERSION > PHASE_9_INITIAL_MIGRATION_VERSION).toBe(true);
    expect(validatePhase9CorrectiveMigrationPresence(correctiveMigration)).toEqual([]);
    expect(fs.existsSync(PHASE_9_CORRECTIVE_MIGRATION_PATH)).toBe(true);
    expect(PHASE_9_CORRECTIVE_MIGRATION_PATH.includes(PHASE_9_INITIAL_MIGRATION_VERSION)).toBe(
      false,
    );
  });

  it("rejects replacing the privilege gate with a verifier exemption", () => {
    const withoutDefaultAcl = verifier.replace(/default_acl_violations/g, "schema_acl_violations");
    expect(validatePhase9LiveVerifier(withoutDefaultAcl, migration)).toEqual(
      expect.arrayContaining([
        "Live verifier must fail closed on unauthorized API-role privileges.",
        "Live verifier must retain default_acl_violations.",
      ]),
    );

    const withoutAclDefault = verifier.replace(/acldefault\s*\(/g, "null::aclitem[] -- ");
    expect(validatePhase9LiveVerifier(withoutAclDefault, migration)).toContain(
      "Live verifier must retain the acldefault fallback for default privileges.",
    );
  });

  it("rejects a corrective migration that omits fail-closed default-ACL enforcement", () => {
    const weakened = correctiveMigration.replace(/raise exception/gi, "raise notice");
    expect(validatePhase9CorrectiveMigrationPresence(weakened)).toContain(
      "Corrective migration must fail closed when the function default ACL is not established.",
    );
  });

  it("keeps canonical local configuration unlinked and secret-free", () => {
    expect(supabaseConfig).toContain('project_id = "institutionlens-platform"');
    expect(supabaseConfig).toContain("major_version = 17");
    expect(supabaseConfig).toMatch(/\[db\.migrations\][\s\S]*?enabled = true/);
    expect(supabaseConfig).not.toMatch(/^\s*(project_ref|linked_project_ref)\s*=/im);
    expect(supabaseConfig).not.toMatch(
      /^\s*[a-z0-9_]*(?:password|token|secret|credential|private_key|service_key|database_url)[a-z0-9_]*\s*=/im,
    );
    expect(supabaseConfig).not.toMatch(/env\s*\(|SUPABASE_DB_PASSWORD|sbp_[a-z0-9]/i);
    expect(supabaseConfig).not.toMatch(/^\s*\[(auth|db\.seed|experimental)(?:\.|\])/im);
    expect(supabaseConfig).toMatch(/^\s*schemas\s*=\s*\[[^\]]*institutionlens_api/im);
    expect(supabaseConfig).not.toMatch(/^\s*schemas\s*=\s*\[[^\]]*["']institutionlens["']/im);
    expect(fs.existsSync("supabase/seed.sql")).toBe(false);
  });

  it("ignores local Supabase and credential metadata", () => {
    expect(supabaseIgnore).toMatch(/^\.branches$/m);
    expect(supabaseIgnore).toMatch(/^\.temp$/m);
    expect(supabaseIgnore).toMatch(/^\.env\.keys$/m);
    expect(supabaseIgnore).toMatch(/^\.env\.local$/m);
  });
});
