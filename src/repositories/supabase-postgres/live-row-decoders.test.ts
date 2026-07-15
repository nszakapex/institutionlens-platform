import { describe, expect, it } from "vitest";
import { RepositoryError } from "@/repositories/repository-errors";
import {
  decodeBriefSnapshotRow,
  decodeEvidenceRow,
  decodeOrganizationPage,
  decodeOrganizationRow,
  decodeSavedComparisonRow,
  parseLiveTenantBinding,
  type LiveTenantBinding,
} from "@/repositories/supabase-postgres/live-row-decoders";
import {
  DEFERRED_READ_GATEWAY_OPERATIONS,
  GATEWAY_OPERATION_TO_RPC,
  NARROW_READ_GATEWAY_OPERATIONS,
  NARROW_READ_RPC_FUNCTIONS,
} from "@/repositories/supabase-postgres/rpc-surface";

const BINDING: LiveTenantBinding = Object.freeze({
  tenantId: "tenant_demo_research",
  tenantPublicRef: "tref_0123456789abcdef0123",
});

const OTHER_BINDING: LiveTenantBinding = Object.freeze({
  tenantId: "tenant_other_demo",
  tenantPublicRef: "tref_fedcba9876543210fedc",
});

const orgWire = Object.freeze({
  tenantPublicRef: BINDING.tenantPublicRef,
  id: "org_syn_fi_001",
  publicRef: "oref_0123456789abcdef01",
  verticalId: "financial_institutions",
  adapterVersion: "1.0.0",
  displayName: "Example Bank",
  organizationType: "bank",
  lifecycleStatus: "active",
  primaryLocation: { regionCode: "US_WEST", countryCode: "US" },
  summary: "Synthetic organization summary for decoder coverage.",
  tags: ["demo"],
  externalReferences: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  synthetic: true,
  dataClassification: "synthetic",
  fit: { status: "unassessed" },
  domainSchemaVersion: "1.0.0",
  verticalPayload: {},
});

describe("Phase 9 live row decoders", () => {
  it("validates wire tenantPublicRef against the server binding, then strips it", () => {
    const decoded = decodeOrganizationRow(orgWire, BINDING);
    expect(decoded.tenantId).toBe(BINDING.tenantId);
    expect(decoded).not.toHaveProperty("tenantPublicRef");
    expect(decoded.id).toBe("org_syn_fi_001");
    expect(Object.isFrozen(decoded)).toBe(true);
  });

  it("rejects tenantPublicRef mismatches and mixed-tenant pages", () => {
    expect(() => decodeOrganizationRow(orgWire, OTHER_BINDING)).toThrow(RepositoryError);
    expect(() =>
      decodeOrganizationPage(
        {
          items: [
            orgWire,
            { ...orgWire, tenantPublicRef: OTHER_BINDING.tenantPublicRef, id: "org_syn_fi_002" },
          ],
          page: 1,
          pageSize: 12,
          total: 2,
        },
        BINDING,
      ),
    ).toThrow(RepositoryError);
  });

  it("rejects withheld keys and raw UUIDs before projection", () => {
    expect(() => decodeOrganizationRow({ ...orgWire, privateNotes: "secret" }, BINDING)).toThrow(
      RepositoryError,
    );
    expect(() =>
      decodeOrganizationRow({ ...orgWire, id: "11111111-1111-4111-8111-111111111111" }, BINDING),
    ).toThrow(RepositoryError);
    expect(() =>
      decodeOrganizationRow(
        { ...orgWire, user_id: "11111111-1111-4111-8111-111111111111" },
        BINDING,
      ),
    ).toThrow(RepositoryError);
  });

  it("requires a server-authenticated LiveTenantBinding", () => {
    expect(() =>
      parseLiveTenantBinding({ tenantId: BINDING.tenantId, tenantPublicRef: undefined }),
    ).toThrow(RepositoryError);
    expect(() =>
      parseLiveTenantBinding({
        tenantId: BINDING.tenantId,
        tenantPublicRef: "client-supplied-tenant",
      }),
    ).toThrow(RepositoryError);
    expect(parseLiveTenantBinding(BINDING)).toEqual(BINDING);
  });

  it("decodes evidence, comparisons, and briefs without private fields", () => {
    const evidence = decodeEvidenceRow(
      {
        tenantPublicRef: BINDING.tenantPublicRef,
        id: "ev_syn_fi_001_profile",
        organizationId: "org_syn_fi_001",
        verticalId: "financial_institutions",
        adapterVersion: "1.0.0",
        evidenceType: "organization_profile",
        epistemicStatus: "verified",
        title: "Profile",
        summary: "Evidence summary for decoder coverage.",
        observation: { kind: "text", value: "observed" },
        observedAt: "2026-01-01T00:00:00.000Z",
        effectivePeriod: null,
        freshness: "current",
        confidence: "high",
        provenanceId: "prov_syn_fi_001_profile",
        publicationEligibility: "eligible",
        synthetic: true,
        dataClassification: "synthetic",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        domainSchemaVersion: "1.0.0",
      },
      BINDING,
    );
    expect(evidence.organizationId).toBe("org_syn_fi_001");
    expect(evidence).not.toHaveProperty("tenantPublicRef");

    const comparison = decodeSavedComparisonRow(
      {
        tenantPublicRef: BINDING.tenantPublicRef,
        publicRef: "cref_0123456789abcdef0123",
        name: "Compare A/B",
        status: "active",
        organizationRefs: ["oref_0123456789abcdef01", "oref_0123456789abcdef02"],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      BINDING,
    );
    expect(comparison.organizationRefs).toHaveLength(2);

    const brief = decodeBriefSnapshotRow(
      {
        tenantPublicRef: BINDING.tenantPublicRef,
        publicRef: "bsref_0123456789abcdef0123",
        organizationRef: "oref_0123456789abcdef01",
        state: "approved",
        templateVersion: "1.0.0",
        publicationEligibility: "eligible",
        contentFingerprint: "a".repeat(64),
        content: { section: "safe" },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      BINDING,
    );
    expect(brief.state).toBe("approved");
  });

  it("keeps the gateway-to-RPC map aligned and disjoint from deferred ops", () => {
    expect(Object.values(GATEWAY_OPERATION_TO_RPC).sort()).toEqual(
      [...NARROW_READ_RPC_FUNCTIONS].sort(),
    );
    expect(NARROW_READ_GATEWAY_OPERATIONS).toHaveLength(9);
    for (const deferred of DEFERRED_READ_GATEWAY_OPERATIONS) {
      expect(NARROW_READ_GATEWAY_OPERATIONS).not.toContain(deferred);
    }
  });
});
