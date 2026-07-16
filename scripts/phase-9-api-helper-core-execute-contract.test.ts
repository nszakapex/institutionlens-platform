import { describe, expect, it } from "vitest";
import {
  EXPECTED_CORE_HELPER_GRANT_SIGNATURES,
  readAndValidatePhase9ApiHelperCoreExecute,
  validatePhase9ApiHelperCoreExecuteMigration,
  validatePhase9ApiHelperCoreExecuteRollback,
} from "./phase-9-api-helper-core-execute-contract";

describe("phase-9-api-helper-core-execute-contract", () => {
  it("accepts the prepared helper-core-execute migration and rollback", () => {
    expect(readAndValidatePhase9ApiHelperCoreExecute()).toEqual([]);
  });

  it("requires an exact authenticated helper EXECUTE allowlist with no broad grants", () => {
    expect(EXPECTED_CORE_HELPER_GRANT_SIGNATURES).toHaveLength(29);
    expect(
      validatePhase9ApiHelperCoreExecuteMigration(
        "alter function x set schema institutionlens;\ngrant execute on all functions in schema institutionlens to authenticated;",
      ),
    ).toContain("Must not grant EXECUTE on all functions in a schema.");
    expect(
      validatePhase9ApiHelperCoreExecuteMigration("security definer\nset schema institutionlens"),
    ).toContain("Helper-core-execute migration must not introduce SECURITY DEFINER.");
  });

  it("requires rollback to restore API-schema helpers without DEFINER", () => {
    expect(validatePhase9ApiHelperCoreExecuteRollback("drop schema institutionlens;")).toEqual(
      expect.arrayContaining([
        "Rollback must move helpers back to institutionlens_api.",
        "Rollback must revoke helper EXECUTE after restoring API-schema helpers.",
      ]),
    );
  });
});
