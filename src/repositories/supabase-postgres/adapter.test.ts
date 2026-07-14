import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDemoAuthorizationContext } from "@/authorization/demo-context";
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
  supabasePublishableKey: "sb_publishable_offline_adapter_test_1234",
  requestTimeoutMs: 1_000,
  maxPageSize: 50,
});

function setDemoEnv(): void {
  process.env.IL_APP_MODE = "local-demo";
  process.env.IL_DEMO_TENANT_ID = "demo-tenant-local";
  process.env.IL_DEMO_PRINCIPAL_ID = "demo-principal-local";
}

describe("Supabase/Postgres repository adapter", () => {
  beforeEach(setDemoEnv);

  it("delegates tenant-scoped opaque reference resolution without raw public state", async () => {
    const organization = loadFinancialInstitutionsStore().organizations[0]!;
    const publicRef = organizationPublicRefFor(organization.id);
    const gateway = new FakeGateway(async () => organization);
    const bundle = createSupabasePostgresRepositoryBundle(CONFIG, gateway);
    const context = getDemoAuthorizationContext();

    const result = await bundle.organizations.getByPublicRef(context, publicRef);
    const request = gateway.requests[0]!;

    expect(result.id).toBe(organization.id);
    expect(Object.isFrozen(result)).toBe(true);
    expect(request.operation).toBe("organizations.getByPublicRef");
    expect(request.authorization.tenantId).toBe(context.tenant.id);
    expect(request.authorization.principalId).toBe(context.principal.id);
    expect(request.input).toEqual({ organizationRef: publicRef });
    expect(Object.isFrozen(request.input)).toBe(true);
    expect(Object.isFrozen(request.authorization)).toBe(true);
    expect(JSON.stringify(request.input)).not.toContain(organization.id);
  });

  it("rejects cross-tenant gateway responses without disclosing existence", async () => {
    const organization = loadFinancialInstitutionsStore().organizations[0]!;
    const gateway = new FakeGateway(async () => ({
      ...organization,
      tenantId: "tenant_other_demo",
    }));
    const bundle = createSupabasePostgresRepositoryBundle(CONFIG, gateway);

    await expect(
      bundle.organizations.getByPublicRef(
        getDemoAuthorizationContext(),
        organizationPublicRefFor(organization.id),
      ),
    ).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      publicMessage: "The data service returned an invalid response.",
    });
  });

  it("enforces page, page-size, and sort bounds before calling the gateway", async () => {
    const gateway = new FakeGateway(async () => ({ items: [], page: 1, pageSize: 12, total: 0 }));
    const bundle = createSupabasePostgresRepositoryBundle(CONFIG, gateway);
    const context = getDemoAuthorizationContext();

    await expect(bundle.organizations.list(context, { page: 10_001 } as never)).rejects.toThrow(
      RepositoryError,
    );
    await expect(bundle.organizations.list(context, { pageSize: 51 } as never)).rejects.toThrow(
      RepositoryError,
    );
    await expect(
      bundle.organizations.list(context, { sortField: "raw_database_column" } as never),
    ).rejects.toThrow(RepositoryError);
    expect(gateway.requests).toHaveLength(0);
  });

  it("classifies timeouts and upstream failures without leaking messages or logging", async () => {
    const leakedValue = "sb_publishable_should_never_escape_1234";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const timeoutGateway = new FakeGateway(() => new Promise(() => undefined));
    const timeoutBundle = createSupabasePostgresRepositoryBundle(
      { ...CONFIG, requestTimeoutMs: 5 },
      timeoutGateway,
    );

    await expect(
      timeoutBundle.organizations.list(getDemoAuthorizationContext(), {}),
    ).rejects.toMatchObject({ code: "TIMEOUT", publicMessage: "The data request timed out." });

    const failedGateway = new FakeGateway(async () => {
      throw new Error(`upstream failed with ${leakedValue}`);
    });
    const failedBundle = createSupabasePostgresRepositoryBundle(CONFIG, failedGateway);
    let thrown: unknown;
    try {
      await failedBundle.organizations.list(getDemoAuthorizationContext(), {});
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toMatchObject({
      code: "UNAVAILABLE",
      publicMessage: "The data service is unavailable.",
    });
    expect(String(thrown)).not.toContain(leakedValue);
    expect(JSON.stringify(thrown)).not.toContain(leakedValue);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("returns persisted assessment output without recalculation", async () => {
    const context = getDemoAuthorizationContext();
    const persisted = {
      id: "assess_syn_fi_001_portfolio",
      tenantId: context.tenant.id,
      organizationId: "org_syn_fi_001",
      portfolioId: "portfolio_syn_fi_demo",
      verticalId: "financial_institutions",
      schemaVersion: "1.0.0",
      status: "insufficient_evidence",
      portfolioPriorityScore: null,
      bestObservedCapabilityFit: null,
      capabilityAssessmentIds: [],
      contributions: [],
      coverage: {
        enabledCapabilityCount: 5,
        assessedCapabilityCount: 0,
        insufficientCapabilityCount: 5,
        enabledPriorityWeight: 25,
        assessedPriorityWeight: 0,
        conditionalOnAssessedCapabilities: true,
      },
      confidence: "unknown",
      freshness: "unknown",
      completeness: "insufficient",
      publicationEligibility: "review_required",
      opportunityContexts: [],
      assessedAt: "2026-01-15T12:00:00.000Z",
      engineVersion: "1.0.0",
      aggregationPolicyVersion: "1.0.0",
      synthetic: true,
    } as const;
    const gateway = new FakeGateway(async () => persisted);
    const bundle = createSupabasePostgresRepositoryBundle(CONFIG, gateway);

    const result = await bundle.assessments.getPortfolioAssessment(context, persisted.id);

    expect(result).toEqual(persisted);
    expect(gateway.requests).toHaveLength(1);
    expect(gateway.requests[0]?.operation).toBe("assessments.getPortfolio");
  });

  it("removes private-note fields and rejects unsafe snapshot content", async () => {
    const context = getDemoAuthorizationContext();
    const store = loadFinancialInstitutionsStore();
    const provenance = { ...store.provenance[0]!, notes: "private-test-marker" };
    const provenanceGateway = new FakeGateway(async () => provenance);
    const provenanceBundle = createSupabasePostgresRepositoryBundle(CONFIG, provenanceGateway);

    const safeProvenance = await provenanceBundle.organizations.getProvenance(
      context,
      provenance.id,
    );
    expect(safeProvenance).not.toHaveProperty("notes");
    expect(JSON.stringify(safeProvenance)).not.toContain("private-test-marker");

    const unsafeSnapshot = {
      tenantId: context.tenant.id,
      publicRef: "bsref_0123456789abcdef0123",
      organizationRef: organizationPublicRefFor(store.organizations[0]!.id),
      state: "draft",
      templateVersion: "1.0.0",
      publicationEligibility: "internal_only",
      contentFingerprint: "a".repeat(64),
      content: { summary: "org_syn_fi_001" },
      createdAt: "2026-01-15T12:00:00.000Z",
      updatedAt: "2026-01-15T12:00:00.000Z",
    } as const;
    const snapshotGateway = new FakeGateway(async () => unsafeSnapshot);
    const snapshotBundle = createSupabasePostgresRepositoryBundle(CONFIG, snapshotGateway);

    await expect(
      snapshotBundle.briefSnapshots.getByPublicRef(context, unsafeSnapshot.publicRef),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("fails closed if a restricted evidence row reaches an unauthorized request", async () => {
    const context = getDemoAuthorizationContext();
    const store = loadFinancialInstitutionsStore();
    const organization = store.organizations[0]!;
    const restricted = {
      ...store.evidence.find((item) => item.organizationId === organization.id)!,
      accessClassification: "restricted",
      publicationEligibility: "restricted",
    } as const;
    const gateway = new FakeGateway(async () => ({
      items: [restricted],
      page: 1,
      pageSize: 12,
      total: 1,
    }));
    const bundle = createSupabasePostgresRepositoryBundle(CONFIG, gateway);

    await expect(
      bundle.organizations.listEvidence(context, organization.id, {}),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});
