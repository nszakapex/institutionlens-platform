import { describe, expect, it, vi } from "vitest";
import {
  RepositoryConfigurationError,
  loadRepositoryConfig,
} from "@/repositories/repository-config";
import { createRepositoryBundle } from "@/repositories/repository-provider";

const PROJECT_REF = "abcdefghijklmnopqrst";
const PUBLISHABLE_KEY = "sb_publishable_offline_test_value_123456";

function productionEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    IL_APP_MODE: "production",
    IL_SUPABASE_URL: `https://${PROJECT_REF}.supabase.co`,
    IL_SUPABASE_PROJECT_REF: PROJECT_REF,
    IL_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
    IL_REPOSITORY_REQUEST_TIMEOUT_MS: "2500",
    IL_REPOSITORY_MAX_PAGE_SIZE: "25",
    NODE_ENV: "production",
    ...overrides,
  };
}

describe("loadRepositoryConfig", () => {
  it("accepts a consistent production configuration without exposing values", () => {
    const config = loadRepositoryConfig(productionEnv());

    expect(config).toEqual({
      mode: "production",
      supabaseUrl: `https://${PROJECT_REF}.supabase.co`,
      supabaseProjectRef: PROJECT_REF,
      supabasePublishableKey: PUBLISHABLE_KEY,
      requestTimeoutMs: 2500,
      maxPageSize: 25,
    });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it.each([
    ["missing mode", productionEnv({ IL_APP_MODE: undefined })],
    ["missing URL", productionEnv({ IL_SUPABASE_URL: undefined })],
    ["malformed URL", productionEnv({ IL_SUPABASE_URL: "not-a-url" })],
    [
      "inconsistent project reference",
      productionEnv({ IL_SUPABASE_URL: "https://zzzzzzzzzzzzzzzzzzzz.supabase.co" }),
    ],
    ["invalid timeout", productionEnv({ IL_REPOSITORY_REQUEST_TIMEOUT_MS: "60000" })],
    ["invalid page size", productionEnv({ IL_REPOSITORY_MAX_PAGE_SIZE: "51" })],
  ])("fails closed for %s", (_label, env) => {
    expect(() => loadRepositoryConfig(env)).toThrow(RepositoryConfigurationError);
  });

  it("requires local demo to be explicit and rejects mixed or production demo execution", () => {
    expect(() =>
      loadRepositoryConfig({
        IL_APP_MODE: "local-demo",
        IL_DEMO_TENANT_ID: "demo-tenant-local",
        IL_DEMO_PRINCIPAL_ID: "demo-principal-local",
        IL_SUPABASE_URL: `https://${PROJECT_REF}.supabase.co`,
        NODE_ENV: "test",
      }),
    ).toThrow(RepositoryConfigurationError);

    expect(() =>
      loadRepositoryConfig({
        IL_APP_MODE: "local-demo",
        IL_DEMO_TENANT_ID: "demo-tenant-local",
        IL_DEMO_PRINCIPAL_ID: "demo-principal-local",
        NODE_ENV: "production",
      }),
    ).toThrow(RepositoryConfigurationError);
  });

  it("rejects public and privileged credential paths", () => {
    const privilegedKey = ["IL_SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");
    const legacyBrowserKey = ["IL_SUPABASE", "ANON", "KEY"].join("_");
    expect(() =>
      loadRepositoryConfig({
        ...productionEnv(),
        NEXT_PUBLIC_SUPABASE_URL: `https://${PROJECT_REF}.supabase.co`,
      }),
    ).toThrow(RepositoryConfigurationError);
    expect(() =>
      loadRepositoryConfig({
        ...productionEnv(),
        [privilegedKey]: "offline-privileged-test-value",
      }),
    ).toThrow(RepositoryConfigurationError);
    expect(() =>
      loadRepositoryConfig({
        ...productionEnv(),
        [legacyBrowserKey]: "offline-legacy-browser-key-value",
      }),
    ).toThrow(RepositoryConfigurationError);
  });

  it("never places configuration values in errors or console output", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let thrown: unknown;
    try {
      loadRepositoryConfig(
        productionEnv({
          IL_SUPABASE_URL: "https://wrong-project.supabase.co",
          IL_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
        }),
      );
    } catch (error) {
      thrown = error;
    }

    const serialized = JSON.stringify(thrown);
    expect(String(thrown)).not.toContain(PUBLISHABLE_KEY);
    expect(serialized).not.toContain(PUBLISHABLE_KEY);
    expect(serialized).not.toContain("wrong-project");
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });
});

describe("createRepositoryBundle", () => {
  it("constructs the synthetic adapter only for explicit local-demo test configuration", () => {
    const bundle = createRepositoryBundle({
      IL_APP_MODE: "local-demo",
      IL_DEMO_TENANT_ID: "demo-tenant-local",
      IL_DEMO_PRINCIPAL_ID: "demo-principal-local",
      NODE_ENV: "test",
    });
    expect(bundle.adapter).toBe("synthetic");
  });

  it("does not fall back to a synthetic adapter in production", () => {
    const createSyntheticBundle = vi.fn();
    expect(() =>
      createRepositoryBundle(productionEnv(), {
        createSyntheticBundle: createSyntheticBundle as never,
      }),
    ).toThrow(RepositoryConfigurationError);
    expect(createSyntheticBundle).not.toHaveBeenCalled();
  });
});
