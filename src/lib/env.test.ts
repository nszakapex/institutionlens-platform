import { describe, expect, it } from "vitest";
import { EnvValidationError, assertNoPublicSecrets, loadServerEnv } from "@/lib/env";

describe("loadServerEnv", () => {
  it("accepts local-demo configuration", () => {
    const env = loadServerEnv({
      IL_APP_MODE: "local-demo",
      IL_DEMO_TENANT_ID: "demo-tenant-local",
      IL_DEMO_PRINCIPAL_ID: "demo-principal-local",
      NODE_ENV: "test",
    });

    expect(env.IL_APP_MODE).toBe("local-demo");
    expect(env.IL_DEMO_TENANT_ID).toBe("demo-tenant-local");
  });

  it("fails closed for non-demo modes", () => {
    expect(() =>
      loadServerEnv({
        IL_APP_MODE: "production",
        IL_DEMO_TENANT_ID: "demo-tenant-local",
        IL_DEMO_PRINCIPAL_ID: "demo-principal-local",
      }),
    ).toThrow(EnvValidationError);
  });

  it("fails closed when tenant id is missing", () => {
    expect(() =>
      loadServerEnv({
        IL_APP_MODE: "local-demo",
        IL_DEMO_PRINCIPAL_ID: "demo-principal-local",
      }),
    ).toThrow(EnvValidationError);
  });
});

describe("assertNoPublicSecrets", () => {
  it("rejects public demo env leakage keys", () => {
    expect(() =>
      assertNoPublicSecrets({
        NEXT_PUBLIC_IL_DEMO_TENANT_ID: "leaked",
      }),
    ).toThrow(EnvValidationError);
  });
});
