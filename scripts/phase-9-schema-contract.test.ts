import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PHASE_9_CORRECTIVE_MIGRATION_PATH,
  PHASE_9_CORRECTIVE_MIGRATION_VERSION,
  PHASE_9_CORRECTIVE_ROLLBACK_PATH,
  PHASE_9_INITIAL_MIGRATION_VERSION,
  PHASE_9_MIGRATION_PATH,
  PHASE_9_ROLLBACK_PATH,
  readAndValidatePhase9Schema,
  validatePhase9CorrectiveMigration,
  validatePhase9CorrectiveRollback,
  validatePhase9Migration,
  validatePhase9Rollback,
} from "./phase-9-schema-contract";

const migration = fs.readFileSync(PHASE_9_MIGRATION_PATH, "utf8");
const rollback = fs.readFileSync(PHASE_9_ROLLBACK_PATH, "utf8");
const correctiveMigration = fs.readFileSync(PHASE_9_CORRECTIVE_MIGRATION_PATH, "utf8");
const correctiveRollback = fs.readFileSync(PHASE_9_CORRECTIVE_ROLLBACK_PATH, "utf8");

describe("Phase 9 initial database schema contract", () => {
  it("passes every fail-closed schema and rollback contract", () => {
    expect(readAndValidatePhase9Schema()).toEqual([]);
  });

  it("detects a table that no longer forces RLS", () => {
    const weakened = migration.replace(
      "alter table institutionlens.evidence_records force row level security;",
      "",
    );
    expect(validatePhase9Migration(weakened)).toContain("evidence_records must force RLS.");
  });

  it("detects a cross-tenant-capable domain foreign key", () => {
    const weakened = migration.replace(
      "foreign key (tenant_id, organization_id)\n    references institutionlens.organizations(tenant_id, id) on delete cascade",
      "foreign key (organization_id)\n    references institutionlens.organizations(id) on delete cascade",
    );
    expect(validatePhase9Migration(weakened)).toContain(
      "Foreign key to organizations is not tenant-composite.",
    );
  });

  it("detects a cross-organization evidence lineage edge", () => {
    const weakened = migration.replace(
      "references institutionlens.evidence_records(tenant_id, id, organization_id) on delete restrict",
      "references institutionlens.evidence_records(tenant_id, id) on delete restrict",
    );
    expect(validatePhase9Migration(weakened)).toContain(
      "Missing or incomplete same-entity lineage constraint: references institutionlens.evidence_records(tenant_id, id, organization_id).",
    );
  });

  it("detects a premature allow policy", () => {
    const weakened = migration.replace(
      "commit;",
      "create policy unsafe_read on institutionlens.organizations for select using (true);\ncommit;",
    );
    expect(validatePhase9Migration(weakened)).toContain(
      "Batch 1 must not add an RLS allow policy.",
    );
  });

  it("detects restricted evidence entering safe search", () => {
    const weakened = migration.replace(
      "access_classification <> 'restricted' or safe_search_text = ''",
      "safe_search_text is not null",
    );
    expect(validatePhase9Migration(weakened)).toContain(
      "Restricted evidence must be excluded from safe search text.",
    );
  });

  it("requires destructive rollback labeling", () => {
    expect(validatePhase9Rollback(rollback.replace("DESTRUCTIVE", "CAUTION"))).toContain(
      "Rollback must carry an explicit DESTRUCTIVE warning.",
    );
  });

  it("requires the corrective default-privilege migration and rollback", () => {
    expect(PHASE_9_CORRECTIVE_MIGRATION_VERSION > PHASE_9_INITIAL_MIGRATION_VERSION).toBe(true);
    expect(fs.existsSync(PHASE_9_CORRECTIVE_MIGRATION_PATH)).toBe(true);
    expect(fs.existsSync(PHASE_9_CORRECTIVE_ROLLBACK_PATH)).toBe(true);
    expect(validatePhase9CorrectiveMigration(correctiveMigration)).toEqual([]);
    expect(validatePhase9CorrectiveRollback(correctiveRollback)).toEqual([]);
  });

  it("rejects a corrective migration that omits function default-ACL fail-closed checks", () => {
    const withoutRaise = correctiveMigration.replace(/raise exception/gi, "raise notice");
    expect(validatePhase9CorrectiveMigration(withoutRaise)).toContain(
      "Corrective migration must fail closed when the function default ACL is not established.",
    );

    const withoutFunctionAcl = correctiveMigration.replace(
      /defaclobjtype = 'f'/g,
      "defaclobjtype = 'r'",
    );
    expect(validatePhase9CorrectiveMigration(withoutFunctionAcl)).toContain(
      "Corrective migration must require a materialized function default-ACL row.",
    );
  });

  it("rejects a corrective migration that grants API-role privileges", () => {
    const weakened = correctiveMigration.replace(
      "commit;",
      "grant usage on schema institutionlens to anon;\ncommit;",
    );
    expect(validatePhase9CorrectiveMigration(weakened)).toContain(
      "Corrective migration must not grant privileges to public or API roles.",
    );
  });

  it("rejects a corrective rollback that drops the schema or hides PUBLIC EXECUTE restoration", () => {
    expect(
      validatePhase9CorrectiveRollback(
        correctiveRollback.replace("PUBLIC EXECUTE", "prior privilege state"),
      ),
    ).toContain("Corrective rollback must disclose that PUBLIC EXECUTE is restored.");
    expect(
      validatePhase9CorrectiveRollback(
        `${correctiveRollback}\ndrop schema institutionlens cascade;`,
      ),
    ).toContain("Corrective rollback must not drop the institutionlens schema.");
    expect(
      validatePhase9CorrectiveRollback(
        correctiveRollback.replace("security-reverting emergency", "routine"),
      ),
    ).toContain("Corrective rollback must be labeled as a security-reverting emergency operation.");
    expect(
      validatePhase9CorrectiveRollback(
        correctiveRollback.replace("Not a safe production rollback.", ""),
      ),
    ).toContain("Corrective rollback must state it is not a safe production rollback.");
  });
});
