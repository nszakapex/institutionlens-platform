import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getFoundingContactUrl, loadServerEnv } from "@/lib/env";

const ROOT = process.cwd();

describe("Phase 11 auth boundary packaging", () => {
  it("keeps the public root shell from throwing on repository misconfiguration", () => {
    const layout = readFileSync(path.join(ROOT, "src/app/layout.tsx"), "utf8");
    expect(layout).toMatch(/resolveShellAppMode|unconfigured/);
    expect(layout).toMatch(/catch/);
  });

  it("fails closed from app layout with login redirect or access-pending", () => {
    const layout = readFileSync(path.join(ROOT, "src/app/(app)/layout.tsx"), "utf8");
    expect(layout).toMatch(/getRequestAccess/);
    expect(layout).toMatch(/AuthorizationError/);
    expect(layout).toMatch(/unauthenticated/);
    expect(layout).toMatch(/safeReturnPath/);
    expect(layout).toMatch(/AccessPendingScreen/);
    expect(layout).toMatch(/redirect\(`\/login\?returnTo=/);
  });

  it("guards login return path in LoginForm", () => {
    const form = readFileSync(path.join(ROOT, "src/components/auth/LoginForm.tsx"), "utf8");
    expect(form).toMatch(/safeReturnPath/);
    expect(form).toMatch(/router\.replace\(destination\)/);
    expect(form).not.toMatch(/router\.replace\("\/"\)/);
  });

  it("keeps access-pending copy non-enumerating", () => {
    const screen = readFileSync(
      path.join(ROOT, "src/components/auth/AccessPendingScreen.tsx"),
      "utf8",
    );
    expect(screen).toMatch(/Invitation required|invitation/i);
    expect(screen).toMatch(/does not confirm whether/i);
    expect(screen).not.toMatch(/workspace id|user id|\bmembership\b|\btenantId\b/i);
  });

  it("accepts optional HTTPS founding contact URL and ignores empty", () => {
    const env = loadServerEnv({
      IL_APP_MODE: "local-demo",
      IL_DEMO_TENANT_ID: "demo-tenant-local",
      IL_DEMO_PRINCIPAL_ID: "demo-principal-local",
      IL_FOUNDING_CONTACT_URL: "https://example.com/book",
      NODE_ENV: "test",
    });
    expect(env.IL_FOUNDING_CONTACT_URL).toBe("https://example.com/book");
    expect(
      getFoundingContactUrl({
        IL_APP_MODE: "local-demo",
        IL_DEMO_TENANT_ID: "demo-tenant-local",
        IL_DEMO_PRINCIPAL_ID: "demo-principal-local",
        IL_FOUNDING_CONTACT_URL: "https://example.com/book",
      }),
    ).toBe("https://example.com/book");
    expect(
      getFoundingContactUrl({
        IL_APP_MODE: "local-demo",
        IL_DEMO_TENANT_ID: "demo-tenant-local",
        IL_DEMO_PRINCIPAL_ID: "demo-principal-local",
      }),
    ).toBeUndefined();
  });
});
