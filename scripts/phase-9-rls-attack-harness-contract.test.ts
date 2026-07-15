import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const HARNESS_PATH = path.join(process.cwd(), "scripts", "phase-9-rls-attack-harness.mjs");
const PLAN_PATH = path.join(process.cwd(), "docs", "PHASE_9_RLS_ATTACK_TEST_PLAN.md");

describe("Phase 9 RLS attack harness contract", () => {
  it("keeps a staging-only harness aligned to the 17-case attack plan", () => {
    const harness = fs.readFileSync(HARNESS_PATH, "utf8");
    const plan = fs.readFileSync(PLAN_PATH, "utf8");

    expect(harness).toContain("Auth Admin");
    expect(harness).not.toMatch(/insert\s+into\s+auth\.users/i);
    expect(harness).toContain("/admin/users");
    expect(harness).toContain("rlsa_phase9");
    expect(harness).toContain("phase-9-live-schema-verify.sql");
    expect(harness).toContain("cases_total");
    expect(harness).toMatch(/01_own_tenant_allow/);
    expect(harness).toMatch(/17_no_table_level_select/);

    expect(plan).toMatch(/17\/17/);
    expect(plan).toContain("phase-9-rls-attack-harness.mjs");
    expect(plan).toMatch(/Executed on staging/);
  });
});
