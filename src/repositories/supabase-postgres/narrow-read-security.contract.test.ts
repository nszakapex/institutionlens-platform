import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { createAuthorizationContext } from "@/authorization/context";
import {
  DEMO_ANALYST,
  DEMO_TENANT,
  DEMO_TENANT_PUBLIC_REF,
  getDemoAuthorizationContext,
} from "@/authorization/demo-context";
import { permissionsForRole } from "@/authorization/policy";
import { organizationPublicRefFor } from "@/domain/organization-public-ref";
import type { ProductionRepositoryConfig } from "@/repositories/repository-config";
import { RepositoryError } from "@/repositories/repository-errors";
import { loadFinancialInstitutionsStore } from "@/repositories/synthetic-organization-repository";
import { createSupabasePostgresRepositoryBundle } from "@/repositories/supabase-postgres/adapter";
import type {
  RepositoryOperation,
  RepositoryOperationMap,
  SupabasePostgresGateway,
  SupabasePostgresGatewayRequest,
} from "@/repositories/supabase-postgres/gateway";
import {
  DEFERRED_READ_GATEWAY_OPERATIONS,
  GATEWAY_OPERATION_TO_RPC,
  NARROW_READ_RPC_FUNCTIONS,
} from "@/repositories/supabase-postgres/rpc-surface";
import {
  EXPECTED_API_RPC_FUNCTIONS,
  EXPECTED_API_RPC_SIGNATURES,
  PHASE_9_API_RPC_MIGRATION_PATH,
  readAndValidatePhase9ApiRpc,
} from "../../../scripts/phase-9-api-rpc-contract";
import { PRIVILEGED_API_ROLE } from "../../../scripts/phase-9-schema-contract";
import { generateSyntheticAssessments } from "@/verticals/financial-institutions/assessment/generate";

function walkTsFiles(directory: string, files: string[] = []): string[] {
  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) walkTsFiles(full, files);
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

type AnyGatewayRequest = {
  [K in RepositoryOperation]: SupabasePostgresGatewayRequest<K>;
}[RepositoryOperation];

class FakeGateway implements SupabasePostgresGateway {
  readonly requests: AnyGatewayRequest[] = [];
  constructor(private readonly handler: (request: AnyGatewayRequest) => Promise<unknown>) {}
  async execute<K extends RepositoryOperation>(
    request: SupabasePostgresGatewayRequest<K>,
  ): Promise<RepositoryOperationMap[K]["output"]> {
    this.requests.push(request as AnyGatewayRequest);
    return (await this.handler(
      request as AnyGatewayRequest,
    )) as RepositoryOperationMap[K]["output"];
  }
}

const CONFIG: ProductionRepositoryConfig = Object.freeze({
  mode: "production",
  supabaseUrl: "https://abcdefghijklmnopqrst.supabase.co",
  supabaseProjectRef: "abcdefghijklmnopqrst",
  supabasePublishableKey: "sb_publishable_offline_security_contract_1234",
  requestTimeoutMs: 1_000,
  maxPageSize: 50,
});

const ROOT = process.cwd();

describe("Phase 9 narrow read security contract", () => {
  beforeAll(() => {
    process.env.IL_APP_MODE = "local-demo";
    process.env.IL_DEMO_TENANT_ID = "demo-tenant-local";
    process.env.IL_DEMO_PRINCIPAL_ID = "demo-principal-local";
  });

  it("1. tenant binding: SQL + decoder reject cross-tenant mix and client tenant selection", async () => {
    expect(readAndValidatePhase9ApiRpc()).toEqual([]);
    const migration = readFileSync(PHASE_9_API_RPC_MIGRATION_PATH, "utf8");
    for (const fn of EXPECTED_API_RPC_FUNCTIONS) {
      expect(migration).toMatch(
        new RegExp(`function institutionlens_api\\.${fn}\\(\\s*p_tenant_public_ref text`),
      );
    }
    expect(migration).toContain("accessible_tenant_ids()");
    expect(migration).not.toMatch(/p_tenant_id\b/);
    expect(getDemoAuthorizationContext().tenantPublicRef).toBe(DEMO_TENANT_PUBLIC_REF);

    const organization = loadFinancialInstitutionsStore().organizations[0]!;
    const wire = {
      tenantPublicRef: "tref_fedcba9876543210fedc",
      id: organization.id,
      publicRef: organizationPublicRefFor(organization.id),
      verticalId: organization.verticalId,
      adapterVersion: organization.adapterVersion,
      displayName: organization.displayName,
      organizationType: organization.organizationType,
      lifecycleStatus: organization.lifecycleStatus,
      primaryLocation: organization.primaryLocation,
      summary: organization.summary,
      tags: organization.tags,
      externalReferences: organization.externalReferences,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
      synthetic: organization.synthetic,
      dataClassification: organization.dataClassification,
      fit: organization.fit,
      domainSchemaVersion: organization.domainSchemaVersion,
      verticalPayload: organization.verticalPayload,
    };
    const gateway = new FakeGateway(async () => wire);
    const bundle = createSupabasePostgresRepositoryBundle(CONFIG, gateway);
    await expect(
      bundle.organizations.getByPublicRef(
        getDemoAuthorizationContext(),
        organizationPublicRefFor(organization.id),
      ),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("1b. multi-membership cannot mix rows across tenants in one page", async () => {
    const store = loadFinancialInstitutionsStore();
    const first = store.organizations[0]!;
    const second = store.organizations[1]!;
    const toWire = (
      organization: (typeof store.organizations)[number],
      tenantPublicRef: string,
    ) => ({
      tenantPublicRef,
      id: organization.id,
      publicRef: organizationPublicRefFor(organization.id),
      verticalId: organization.verticalId,
      adapterVersion: organization.adapterVersion,
      displayName: organization.displayName,
      organizationType: organization.organizationType,
      lifecycleStatus: organization.lifecycleStatus,
      primaryLocation: organization.primaryLocation,
      summary: organization.summary,
      tags: organization.tags,
      externalReferences: organization.externalReferences,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
      synthetic: organization.synthetic,
      dataClassification: organization.dataClassification,
      fit: organization.fit,
      domainSchemaVersion: organization.domainSchemaVersion,
      verticalPayload: organization.verticalPayload,
    });
    const gateway = new FakeGateway(async () => ({
      items: [toWire(first, DEMO_TENANT_PUBLIC_REF), toWire(second, "tref_fedcba9876543210fedc")],
      page: 1,
      pageSize: 12,
      total: 2,
    }));
    const bundle = createSupabasePostgresRepositoryBundle(CONFIG, gateway);
    await expect(
      bundle.organizations.list(getDemoAuthorizationContext(), {}),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("1c. p_tenant_public_ref is derived only from server session binding, never client input", async () => {
    const adapterSource = readFileSync(
      path.join(ROOT, "src/repositories/supabase-postgres/adapter.ts"),
      "utf8",
    );
    expect(adapterSource).toMatch(
      /parseLiveTenantBinding\(\{\s*tenantId:\s*context\.tenant\.id,\s*tenantPublicRef:\s*context\.tenantPublicRef,/s,
    );
    expect(adapterSource).not.toMatch(/input\.[A-Za-z]*[Tt]enant/);
    expect(adapterSource).not.toMatch(/searchParams|URLSearchParams|formData/);

    const querySource = readFileSync(path.join(ROOT, "src/domain/schemas/query.ts"), "utf8");
    expect(querySource).not.toMatch(/tenantPublicRef|tenantId|p_tenant/);

    const appDir = path.join(ROOT, "src/app");
    for (const file of walkTsFiles(appDir)) {
      const content = readFileSync(file, "utf8");
      const relative = path.relative(ROOT, file);
      expect(content, relative).not.toMatch(
        /tenantPublicRef|p_tenant_public_ref|institutionlens_api/,
      );
      expect(content, relative).not.toMatch(/createAuthorizationContext\s*\(/);
      if (/searchParams/.test(content)) {
        expect(content, relative).toMatch(/getRequestAccess\(\)/);
        expect(content, relative).not.toMatch(
          /getRequestAccess\([^)]*searchParams|createAuthorizationContext\([\s\S]*searchParams/,
        );
      }
      if (relative.replace(/\\/g, "/").includes("src/app/(app)/") && /page\.tsx$/.test(relative)) {
        expect(content, relative).toMatch(/getRequestAccess\(\)/);
        expect(content, relative).not.toMatch(/getDemoAuthorizationContext\(\)/);
      }
    }

    const clientFiles = walkTsFiles(path.join(ROOT, "src")).filter((file) =>
      /^['"]use client['"];/m.test(readFileSync(file, "utf8")),
    );
    expect(clientFiles.length).toBeGreaterThan(0);
    for (const file of clientFiles) {
      const content = readFileSync(file, "utf8");
      expect(content, path.relative(ROOT, file)).not.toMatch(
        /tenantPublicRef|p_tenant_public_ref|institutionlens_api|\.rpc\s*\(/,
      );
      expect(content, path.relative(ROOT, file)).not.toMatch(/@\/repositories\//);
    }

    const unbound = createAuthorizationContext(
      DEMO_TENANT,
      DEMO_ANALYST,
      permissionsForRole("analyst").filter((action) => action === "organization:read"),
    );
    expect(unbound.tenantPublicRef).toBeUndefined();
    const gateway = new FakeGateway(async () => {
      throw new Error("must not invoke gateway without server tenant binding");
    });
    const bundle = createSupabasePostgresRepositoryBundle(CONFIG, gateway);
    await expect(bundle.organizations.list(unbound, {})).rejects.toMatchObject({
      code: "MISCONFIGURED",
    });
    expect(gateway.requests).toHaveLength(0);

    // Client-forged wire tenant cannot override the already-validated session binding.
    const organization = loadFinancialInstitutionsStore().organizations[0]!;
    const forgedGateway = new FakeGateway(async () => ({
      ...organization,
      tenantId: undefined,
      tenantPublicRef: "tref_clientforged00000001",
      publicRef: organizationPublicRefFor(organization.id),
    }));
    const forgedBundle = createSupabasePostgresRepositoryBundle(CONFIG, forgedGateway);
    await expect(
      forgedBundle.organizations.getByPublicRef(
        getDemoAuthorizationContext(),
        organizationPublicRefFor(organization.id),
      ),
    ).rejects.toBeInstanceOf(RepositoryError);
  });

  it("2. raw-ID boundary: getById/source_key paths stay server-only", () => {
    for (const relative of [
      "src/repositories/organization-repository.ts",
      "src/repositories/supabase-postgres/adapter.ts",
      "src/repositories/supabase-postgres/gateway.ts",
      "src/repositories/supabase-postgres/rpc-surface.ts",
      "src/repositories/supabase-postgres/live-row-decoders.ts",
    ]) {
      const content = readFileSync(path.join(ROOT, relative), "utf8");
      expect(content, relative).toMatch(/^import ["']server-only["'];/m);
    }
    const migration = readFileSync(PHASE_9_API_RPC_MIGRATION_PATH, "utf8");
    expect(migration).toContain("organizations_get_by_domain_id");
    expect(migration).toMatch(/o\.source_key\s*=\s*p_domain_id/);
    expect(GATEWAY_OPERATION_TO_RPC["organizations.getById"]).toBe(
      "organizations_get_by_domain_id",
    );
    expect(migration).toMatch(/organizations_get_by_public_ref/);
    expect(migration).toMatch(/o\.public_ref\s*=\s*p_public_ref/);
    // Public-ref RPC projects domain source_key as id, never UUID PKs.
    expect(migration).toMatch(/'id',\s*p_org\.source_key/);
    expect(migration).not.toMatch(/'id',\s*p_org\.id\b/);
    expect(migration).not.toMatch(/o\.id\s*=\s*p_public_ref/);

    for (const relative of [
      "src/app/(app)/organizations/page.tsx",
      "src/app/(app)/organizations/[organizationRef]/page.tsx",
    ]) {
      const full = path.join(ROOT, relative);
      if (!existsSync(full)) continue;
      const content = readFileSync(full, "utf8");
      expect(content, relative).not.toMatch(/organizations\.getById|getByDomainId|source_key/);
      expect(content, relative).not.toMatch(/@\/repositories\/supabase-postgres/);
    }

    // Direct RPC surface is server-only; no browser SDK transport exists yet.
    for (const relative of [
      "src/repositories/supabase-postgres/rpc-surface.ts",
      "src/repositories/supabase-postgres/gateway.ts",
      "src/repositories/supabase-postgres/adapter.ts",
      "src/repositories/supabase-postgres/live-row-decoders.ts",
    ]) {
      const content = readFileSync(path.join(ROOT, relative), "utf8");
      expect(content, relative).toMatch(/^import ["']server-only["'];/m);
      expect(content, relative).not.toMatch(/createBrowserClient|createClient\(|@supabase\/ssr/);
    }
  });

  it("2b. public-ref resolution keeps raw organization IDs out of gateway input", async () => {
    const organization = loadFinancialInstitutionsStore().organizations[0]!;
    const publicRef = organizationPublicRefFor(organization.id);
    const gateway = new FakeGateway(async () => organization);
    const bundle = createSupabasePostgresRepositoryBundle(CONFIG, gateway);
    const result = await bundle.organizations.getByPublicRef(
      getDemoAuthorizationContext(),
      publicRef,
    );
    const request = gateway.requests[0]!;
    expect(request.operation).toBe("organizations.getByPublicRef");
    expect(JSON.stringify(request.input)).toBe(JSON.stringify({ organizationRef: publicRef }));
    expect(JSON.stringify(request.input)).not.toContain(organization.id);
    expect(JSON.stringify(request.input)).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
    );
    // Domain record may carry server-side ids; decoded output must not reintroduce wire tenantPublicRef.
    expect(result).not.toHaveProperty("tenantPublicRef");
    expect(result.id).toBe(organization.id);
  });

  it("3. RPC safety: authenticated-only EXECUTE, invoker, pinned search_path, no writes", () => {
    expect(EXPECTED_API_RPC_FUNCTIONS).toEqual([...NARROW_READ_RPC_FUNCTIONS]);
    expect(EXPECTED_API_RPC_SIGNATURES).toHaveLength(9);
    const migration = readFileSync(PHASE_9_API_RPC_MIGRATION_PATH, "utf8")
      .replace(/--[^\r\n]*/g, " ")
      .replace(/\s+/g, " ")
      .toLowerCase();
    for (const signature of EXPECTED_API_RPC_SIGNATURES) {
      expect(migration).toContain(
        `grant execute on function institutionlens_api.${signature} to authenticated`,
      );
      expect(migration).toContain(
        `revoke all on function institutionlens_api.${signature} from public, anon, authenticated, ${PRIVILEGED_API_ROLE}`,
      );
    }
    expect(migration).toContain("security invoker");
    expect(migration).not.toContain("security definer");
    expect(migration).toContain(
      "set search_path = institutionlens_api, institutionlens, pg_catalog",
    );
    expect(migration).not.toMatch(/\binsert into\b|\bupdate \b|\bdelete from\b/);
    expect(migration).not.toContain("private_notes");
    expect(migration).not.toContain("source_reference");
    expect(migration).not.toMatch(/\buser_id\b/);
  });

  it("4. live read ops delegate to the gateway without synthetic fallback", async () => {
    expect(DEFERRED_READ_GATEWAY_OPERATIONS).toEqual([]);
    const context = getDemoAuthorizationContext();
    const store = loadFinancialInstitutionsStore();
    const organization = store.organizations[0]!;
    const provenance = store.provenance.find((item) => item.tenantId === context.tenant.id)!;
    const portfolio = generateSyntheticAssessments().organizations.find(
      (item) => item.organizationId === organization.id,
    )!.portfolioAssessment;

    const gateway = new FakeGateway(async (request) => {
      switch (request.operation) {
        case "workspace.get":
          return {
            tenantPublicRef: context.tenantPublicRef,
            tenantId: context.tenant.id,
            principalId: context.principal.id,
            displayName: context.principal.displayName,
            status: "active",
            role: "analyst",
            allowedVerticalIds: ["financial_institutions"],
          };
        case "provenance.getById":
          return provenance;
        case "assessments.getPortfolio":
          return portfolio;
        case "portfolios.list":
        case "overlays.list":
          return { items: [], page: 1, pageSize: 12, total: 0 };
        default:
          throw new Error(`unexpected operation ${request.operation}`);
      }
    });
    const bundle = createSupabasePostgresRepositoryBundle(CONFIG, gateway);

    await bundle.workspace.getCurrent(context);
    await bundle.organizations.getProvenance(context, provenance.id);
    await bundle.assessments.getPortfolioAssessment(context, portfolio.id);
    await bundle.portfolios.list(context, {});
    await bundle.overlays.list(context, {});

    expect(gateway.requests.map((request) => request.operation)).toEqual([
      "workspace.get",
      "provenance.getById",
      "assessments.getPortfolio",
      "portfolios.list",
      "overlays.list",
    ]);
  });

  it("4b. supported ops do not fall back to synthetic loaders", () => {
    const adapter = readFileSync(
      path.join(ROOT, "src/repositories/supabase-postgres/adapter.ts"),
      "utf8",
    );
    expect(adapter).not.toMatch(
      /loadFinancialInstitutionsStore|generateSynthetic|synthetic-repository/,
    );
    expect(adapter).toContain('throw new RepositoryError("UNSUPPORTED_OPERATION")');
  });
});
