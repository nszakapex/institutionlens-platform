import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PHASE_9_MIGRATION_PATH,
  PHASE_9_ROLLBACK_PATH,
  readAndValidatePhase9Schema,
  validatePhase9Migration,
  validatePhase9Rollback,
} from "./phase-9-schema-contract";

const migration = fs.readFileSync(PHASE_9_MIGRATION_PATH, "utf8");
const rollback = fs.readFileSync(PHASE_9_ROLLBACK_PATH, "utf8");

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
});
