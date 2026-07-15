import { describe, expect, it } from "vitest";
import { EnvValidationError, assertNoPublicSecrets, loadServerEnv } from "@/lib/env";

const LIVE_SUPABASE_ENV = {
  IL_APP_MODE: "production",
  IL_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
  IL_SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst",
  IL_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key_1234567890",
  NODE_ENV: "test",
} as const;

describe("loadServerEnv", () => {
  it("accepts local-demo configuration", () => {
    const env = loadServerEnv({
      IL_APP_MODE: "local-demo",
      IL_DEMO_TENANT_ID: "demo-tenant-local",
      IL_DEMO_PRINCIPAL_ID: "demo-principal-local",
      NODE_ENV: "test",
    });

    expect(env.IL_APP_MODE).toBe("local-demo");
    if (env.IL_APP_MODE === "local-demo") {
      expect(env.IL_DEMO_TENANT_ID).toBe("demo-tenant-local");
    }
  });

  it("accepts live modes when Supabase keys are present", () => {
    const env = loadServerEnv({ ...LIVE_SUPABASE_ENV });
    expect(env.IL_APP_MODE).toBe("production");
    expect(env).toHaveProperty("IL_SUPABASE_URL");
  });

  it("forbids demo tenant ids in live modes", () => {
    expect(() =>
      loadServerEnv({
        ...LIVE_SUPABASE_ENV,
        IL_DEMO_TENANT_ID: "demo-tenant-local",
        IL_DEMO_PRINCIPAL_ID: "demo-principal-local",
      }),
    ).toThrow(EnvValidationError);
  });

  it("fails closed for production mode without Supabase keys", () => {
    expect(() =>
      loadServerEnv({
        IL_APP_MODE: "production",
        NODE_ENV: "test",
      }),
    ).toThrow(EnvValidationError);
  });

  it("fails closed when tenant id is missing in local-demo", () => {
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
