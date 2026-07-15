import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { PHASE_9_API_RPC_MIGRATION_VERSION } from "./phase-9-api-rpc-contract";
import {
  EXPECTED_REMAINING_API_RPC_FUNCTIONS,
  EXPECTED_REMAINING_API_RPC_SIGNATURES,
  PHASE_9_REMAINING_API_RPC_MIGRATION_PATH,
  PHASE_9_REMAINING_API_RPC_MIGRATION_VERSION,
  PHASE_9_REMAINING_API_RPC_ROLLBACK_PATH,
  readAndValidatePhase9RemainingApiRpc,
  validatePhase9RemainingApiRpcMigration,
  validatePhase9RemainingApiRpcRollback,
} from "./phase-9-remaining-api-rpc-contract";

const migration = fs.readFileSync(PHASE_9_REMAINING_API_RPC_MIGRATION_PATH, "utf8");
const rollback = fs.readFileSync(PHASE_9_REMAINING_API_RPC_ROLLBACK_PATH, "utf8");

const PUBLIC_RPC_FUNCTIONS = EXPECTED_REMAINING_API_RPC_FUNCTIONS.filter(
  (fn) => fn !== "session_tenant_public_ref",
);

describe("Phase 9 remaining read API/RPC contract", () => {
  it("passes the complete remaining API/RPC migration and rollback contract", () => {
    expect(readAndValidatePhase9RemainingApiRpc()).toEqual([]);
    expect(PHASE_9_REMAINING_API_RPC_MIGRATION_VERSION > PHASE_9_API_RPC_MIGRATION_VERSION).toBe(
      true,
    );
    expect(EXPECTED_REMAINING_API_RPC_FUNCTIONS).toHaveLength(16);
    expect(EXPECTED_REMAINING_API_RPC_SIGNATURES).toHaveLength(16);
    expect(EXPECTED_REMAINING_API_RPC_FUNCTIONS).toContain("session_tenant_public_ref");
    expect(EXPECTED_REMAINING_API_RPC_SIGNATURES).toContain("session_tenant_public_ref()");
  });

  it("includes session_tenant_public_ref() and server-bound tenant checks on every public RPC", () => {
    expect(migration).toMatch(
      /create or replace function institutionlens_api\.session_tenant_public_ref\(\)/i,
    );
    expect(migration).toContain("accessible_tenant_ids()");
    expect(migration).toContain("p_tenant_public_ref text");
    expect(migration).not.toMatch(/p_tenant_id\b/);
    for (const fn of PUBLIC_RPC_FUNCTIONS) {
      expect(migration).toMatch(
        new RegExp(`function institutionlens_api\\.${fn}\\(\\s*p_tenant_public_ref text`),
      );
    }
  });

  it("rejects security-definer, dynamic SQL, writes, and broad execute grants", () => {
    expect(validatePhase9RemainingApiRpcMigration(`${migration}\nsecurity definer\n`)).toContain(
      "API RPC migration must not introduce security definer functions.",
    );
    expect(
      validatePhase9RemainingApiRpcMigration(`${migration}\nexecute format('select %s', 'x');\n`),
    ).toContain("API RPC migration must not use dynamic SQL execution.");
    expect(
      validatePhase9RemainingApiRpcMigration(`${migration}\ninsert into institutionlens.tenants\n`),
    ).toContain("API RPC migration must remain read-only (found insert into).");
    expect(
      validatePhase9RemainingApiRpcMigration(
        `${migration}\ngrant execute on function institutionlens_api.workspace_get(text) to anon;\n`,
      ),
    ).toContain("EXECUTE grants must be authenticated-only.");
  });

  it("requires function-only rollback that preserves Batch 4 API schema", () => {
    expect(validatePhase9RemainingApiRpcRollback(rollback)).toEqual([]);
    expect(validatePhase9RemainingApiRpcRollback("select 1;")).toContain(
      "Rollback must drop institutionlens_api.session_tenant_public_ref().",
    );
    expect(
      validatePhase9RemainingApiRpcRollback("drop schema if exists institutionlens_api;"),
    ).toContain("Rollback must drop only Batch 5 functions, not institutionlens_api schema.");
  });
});
