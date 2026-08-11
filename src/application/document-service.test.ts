import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildDocumentsPageView } from "@/application/document-service";
import { createAuthorizationContext } from "@/authorization/context";
import { DEMO_ANALYST, DEMO_TENANT, DEMO_TENANT_PUBLIC_REF } from "@/authorization/demo-context";
import { permissionsForRole } from "@/authorization/policy";
import { createSyntheticRepositoryBundle } from "@/repositories/synthetic-repository-bundle";
import { PrincipalSchema, TenantSchema } from "@/domain/schemas/tenant";

beforeAll(() => {
  process.env.IL_APP_MODE = "local-demo";
  process.env.IL_DEMO_TENANT_ID = "demo-tenant-local";
  process.env.IL_DEMO_PRINCIPAL_ID = "demo-principal-local";
});

describe("document service", () => {
  const cleanupDirs: string[] = [];

  afterEach(() => {
    delete process.env.IL_DOCUMENT_STORE_ROOT;
    for (const dir of cleanupDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("builds a ready vault view with seed document and upload permission", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "il-docs-"));
    cleanupDirs.push(root);
    process.env.IL_DOCUMENT_STORE_ROOT = root;

    const tenant = TenantSchema.parse({
      ...DEMO_TENANT,
      id: "tenant_demo_docs_ready",
    });
    const principal = PrincipalSchema.parse({
      ...DEMO_ANALYST,
      tenantId: tenant.id,
    });
    const context = createAuthorizationContext(tenant, principal, permissionsForRole("analyst"), {
      tenantPublicRef: DEMO_TENANT_PUBLIC_REF,
    });
    const bundle = createSyntheticRepositoryBundle();
    const view = await buildDocumentsPageView(context, bundle);

    expect(view.state).toBe("ready");
    expect(view.canUpload).toBe(true);
    expect(view.canLink).toBe(true);
    expect(view.total).toBeGreaterThanOrEqual(1);
    expect(view.rows[0]?.title).toMatch(/Sample research note/i);
    expect(JSON.stringify(view)).not.toMatch(/doc_syn_fi_|tenant_demo_docs_ready/);
  });

  it("uploads and lists a tenant research file", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "il-docs-upload-"));
    cleanupDirs.push(root);
    process.env.IL_DOCUMENT_STORE_ROOT = root;

    const tenant = TenantSchema.parse({
      ...DEMO_TENANT,
      id: "tenant_demo_docs_upload",
    });
    const principal = PrincipalSchema.parse({
      ...DEMO_ANALYST,
      tenantId: tenant.id,
    });
    const context = createAuthorizationContext(tenant, principal, permissionsForRole("analyst"), {
      tenantPublicRef: DEMO_TENANT_PUBLIC_REF,
    });
    const bundle = createSyntheticRepositoryBundle();
    const bytes = new TextEncoder().encode("Northeast prospect shortlist for model licensing.");
    const uploaded = await bundle.documents.upload(context, {
      title: "Northeast shortlist",
      originalFilename: "northeast-shortlist.txt",
      classification: "portfolio_list",
      contentType: "text/plain",
      bytes,
    });

    expect(uploaded.title).toBe("Northeast shortlist");
    expect(uploaded.status).toBe("uploaded");

    const view = await buildDocumentsPageView(context, bundle);
    expect(view.rows.some((row) => row.title === "Northeast shortlist")).toBe(true);
    expect(view.rows.every((row) => row.documentPublicRef.startsWith("dref_"))).toBe(true);
  });

  it("returns unauthorized when document:read is missing", async () => {
    const bundle = createSyntheticRepositoryBundle();
    const context = createAuthorizationContext(
      DEMO_TENANT,
      DEMO_ANALYST,
      permissionsForRole("analyst").filter((action) => action !== "document:read"),
    );
    const view = await buildDocumentsPageView(context, bundle);
    expect(view.state).toBe("unauthorized");
    expect(view.rows).toHaveLength(0);
  });
});
