import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { DEMO_TENANT_PUBLIC_REF, getDemoAuthorizationContext } from "@/authorization/demo-context";
import { organizationPublicRefFor } from "@/domain/organization-public-ref";
import type { ProductionRepositoryConfig } from "@/repositories/repository-config";
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
  NARROW_READ_GATEWAY_OPERATIONS,
  NARROW_READ_RPC_FUNCTIONS,
} from "@/repositories/supabase-postgres/rpc-surface";
import {
  EXPECTED_API_RPC_FUNCTIONS,
  EXPECTED_API_RPC_SIGNATURES,
  PHASE_9_API_RPC_MIGRATION_PATH,
  readAndValidatePhase9ApiRpc,
} from "../../../scripts/phase-9-api-rpc-contract";
import { PRIVILEGED_API_ROLE } from "../../../scripts/phase-9-schema-contract";

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

  it("4. partial coverage: deferred live ops fail closed with UNSUPPORTED_OPERATION", async () => {
    expect(NARROW_READ_GATEWAY_OPERATIONS).toHaveLength(9);
    expect(DEFERRED_READ_GATEWAY_OPERATIONS.length).toBeGreaterThan(0);
    const gateway = new FakeGateway(async () => {
      throw new Error("synthetic fallback must never run");
    });
    const bundle = createSupabasePostgresRepositoryBundle(CONFIG, gateway);
    const context = getDemoAuthorizationContext();

    await expect(bundle.workspace.getCurrent(context)).rejects.toMatchObject({
      code: "UNSUPPORTED_OPERATION",
      publicMessage: "This data operation is not available.",
    });
    await expect(
      bundle.organizations.getProvenance(context, "prov_syn_fi_001_profile" as never),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_OPERATION" });
    await expect(
      bundle.assessments.getPortfolioAssessment(context, "assess_syn_fi_001_portfolio" as never),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_OPERATION" });
    await expect(bundle.portfolios.list(context, {})).rejects.toMatchObject({
      code: "UNSUPPORTED_OPERATION",
    });
    await expect(bundle.overlays.list(context, {})).rejects.toMatchObject({
      code: "UNSUPPORTED_OPERATION",
    });
    expect(gateway.requests).toHaveLength(0);
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
