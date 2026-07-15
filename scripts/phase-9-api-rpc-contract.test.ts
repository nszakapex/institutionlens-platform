import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EXPECTED_API_RPC_FUNCTIONS,
  EXPECTED_API_RPC_SIGNATURES,
  PHASE_9_API_RPC_MIGRATION_PATH,
  PHASE_9_API_RPC_MIGRATION_VERSION,
  PHASE_9_API_RPC_ROLLBACK_PATH,
  readAndValidatePhase9ApiRpc,
  validatePhase9ApiRpcMigration,
  validatePhase9ApiRpcRollback,
} from "./phase-9-api-rpc-contract";
import { PHASE_9_RLS_MIGRATION_VERSION } from "./phase-9-rls-policy-contract";

const migration = fs.readFileSync(PHASE_9_API_RPC_MIGRATION_PATH, "utf8");
const rollback = fs.readFileSync(PHASE_9_API_RPC_ROLLBACK_PATH, "utf8");

describe("Phase 9 narrow read API/RPC contract", () => {
  it("passes the complete API/RPC migration and rollback contract", () => {
    expect(readAndValidatePhase9ApiRpc()).toEqual([]);
    expect(PHASE_9_API_RPC_MIGRATION_VERSION > PHASE_9_RLS_MIGRATION_VERSION).toBe(true);
    expect(EXPECTED_API_RPC_FUNCTIONS).toHaveLength(9);
    expect(EXPECTED_API_RPC_SIGNATURES).toHaveLength(9);
  });

  it("requires server-bound tenantPublicRef and membership checks on every RPC", () => {
    expect(migration).toContain("p_tenant_public_ref text");
    expect(migration).toContain("accessible_tenant_ids()");
    expect(migration).not.toMatch(/p_tenant_id\b/);
    for (const fn of EXPECTED_API_RPC_FUNCTIONS) {
      expect(migration).toMatch(
        new RegExp(`function institutionlens_api\\.${fn}\\(\\s*p_tenant_public_ref text`),
      );
    }
  });

  it("rejects security-definer, dynamic SQL, writes, and broad execute grants", () => {
    expect(validatePhase9ApiRpcMigration(`${migration}\nsecurity definer\n`)).toContain(
      "API RPC migration must not introduce security definer functions.",
    );
    expect(
      validatePhase9ApiRpcMigration(`${migration}\nexecute format('select %s', 'x');\n`),
    ).toContain("API RPC migration must not use dynamic SQL execution.");
    expect(
      validatePhase9ApiRpcMigration(`${migration}\ninsert into institutionlens.tenants\n`),
    ).toContain("API RPC migration must remain read-only (found insert into).");
    expect(
      validatePhase9ApiRpcMigration(
        `${migration}\ngrant execute on function institutionlens_api.organizations_list(text, jsonb) to anon;\n`,
      ),
    ).toContain("EXECUTE grants must be authenticated-only.");
  });

  it("requires cascade drop rollback only", () => {
    expect(validatePhase9ApiRpcRollback(rollback)).toEqual([]);
    expect(validatePhase9ApiRpcRollback("select 1;")).toContain(
      "Rollback must drop institutionlens_api cascade.",
    );
  });
});
