import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  GATEWAY_OPERATION_TO_RPC,
  LIVE_READ_GATEWAY_OPERATIONS,
  NARROW_READ_GATEWAY_OPERATIONS,
  isLiveReadGatewayOperation,
} from "@/repositories/supabase-postgres/rpc-surface";

const ROOT = path.join(__dirname, "../../..");

describe("Phase 9 live/synthetic parity contracts", () => {
  it("covers every product read surface operation in the live RPC map", () => {
    expect(LIVE_READ_GATEWAY_OPERATIONS.length).toBeGreaterThan(
      NARROW_READ_GATEWAY_OPERATIONS.length,
    );
    for (const operation of LIVE_READ_GATEWAY_OPERATIONS) {
      expect(isLiveReadGatewayOperation(operation)).toBe(true);
      expect(GATEWAY_OPERATION_TO_RPC[operation]).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("keeps request access fail-closed with no silent demo fallback in live modes", () => {
    const source = readFileSync(path.join(ROOT, "src/authorization/request-access.ts"), "utf8");
    expect(source).toContain("createAuthorizationContextFromSession");
    expect(source).toContain("createAuthenticatedRpcGateway");
    expect(source).not.toMatch(/catch\s*\([^)]*\)\s*\{\s*return[\s\S]*getDemoAuthorizationContext/);
    expect(source).toContain('repositories.adapter !== "supabase-postgres"');
  });

  it("redacts private notes and withheld provenance fields on live paths", () => {
    const adapter = readFileSync(
      path.join(ROOT, "src/repositories/supabase-postgres/adapter.ts"),
      "utf8",
    );
    const decoders = readFileSync(
      path.join(ROOT, "src/repositories/supabase-postgres/live-row-decoders.ts"),
      "utf8",
    );
    expect(adapter).toContain("withoutPrivateNotes");
    expect(decoders).toContain("FORBIDDEN_WIRE_KEYS");
    expect(decoders).toContain("privateNotes");
    expect(decoders).toContain("sourceReference");
    expect(decoders).toContain("user_id");
  });

  it("keeps repository public errors free of raw credentials and stack traces", () => {
    const errors = readFileSync(path.join(ROOT, "src/repositories/repository-errors.ts"), "utf8");
    expect(errors).toContain("publicMessage");
    expect(errors).not.toMatch(/service.?role|password|connection string/i);
  });
});
