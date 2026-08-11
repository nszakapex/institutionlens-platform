import "server-only";

import type { z } from "zod";
import type { AuthorizationContext } from "@/authorization/context";
import { assertPermission } from "@/authorization/context";
import type { AssessmentRepository } from "@/repositories/assessment-repository";
import type { OrganizationRepository, PagedResult } from "@/repositories/organization-repository";
import type { OverlayRepository } from "@/repositories/overlay-repository";
import type { PortfolioRepository } from "@/repositories/portfolio-repository";
import {
  AssessmentIdSchema,
  CapabilityIdSchema,
  OrganizationIdSchema,
  OverlayIdSchema,
  PortfolioIdSchema,
  ProvenanceIdSchema,
  type AssessmentId,
  type CapabilityId,
  type OrganizationId,
  type OverlayId,
  type PortfolioId,
  type ProvenanceId,
} from "@/domain/ids";
import {
  OrganizationPublicRefSchema,
  type OrganizationPublicRef,
} from "@/domain/organization-public-ref";
import type { EvidenceRecord } from "@/domain/schemas/evidence";
import type { ProvenanceRecord } from "@/domain/schemas/provenance";
import type { Capability } from "@/domain/schemas/capability";
import type { OrganizationOverlay } from "@/domain/overlays/schemas";
import type { CapabilityPortfolio } from "@/domain/portfolios/schemas";
import type { AssessmentManifest } from "@/domain/assessments/manifest";
import type { RuleLedgerEntry } from "@/domain/assessments/ledger";
import type {
  CapabilityAssessment,
  OpportunityContext,
  PortfolioAssessment,
} from "@/domain/assessments/results";
import {
  AssessmentListQuerySchema,
  CapabilityQuerySchema,
  EvidenceQuerySchema,
  OrganizationQuerySchema,
  OverlayListQuerySchema,
  PortfolioListQuerySchema,
  type AssessmentListQueryInput,
  type CapabilityQueryInput,
  type EvidenceQueryInput,
  type OrganizationQueryInput,
  type OverlayListQueryInput,
  type PortfolioListQueryInput,
} from "@/domain/schemas/query";
import type { ProductionRepositoryConfig } from "@/repositories/repository-config";
import { RepositoryError, classifyRepositoryError } from "@/repositories/repository-errors";
import {
  BriefSnapshotListQuerySchema,
  BriefSnapshotPublicRefSchema,
  SavedComparisonListQuerySchema,
  SavedComparisonPublicRefSchema,
  type BriefSnapshotListQueryInput,
  type BriefSnapshotRecord,
  type BriefSnapshotRepository,
  type RepositoryBundle,
  type SavedComparisonListQueryInput,
  type SavedComparisonRecord,
  type SavedComparisonRepository,
  type WorkspaceContextRecord,
  type WorkspaceRepository,
} from "@/repositories/repository-contracts";
import {
  gatewayAuthorization,
  type RepositoryOperation,
  type RepositoryOperationMap,
  type SupabasePostgresGateway,
} from "@/repositories/supabase-postgres/gateway";
import { UnsupportedDocumentRepository } from "@/repositories/unsupported-document-repository";
import {
  decodeAssessmentManifest,
  decodeBriefPage,
  decodeBriefSnapshotRow,
  decodeCapabilityAssessmentPage,
  decodeCapabilityAssessmentRow,
  decodeCapabilityPage,
  decodeComparisonPage,
  decodeEvidencePage,
  decodeLedgerEntries,
  decodeOpportunityContext,
  decodeOrganizationCount,
  decodeOrganizationPage,
  decodeOrganizationRow,
  decodeOverlayPage,
  decodeOverlayRow,
  decodePortfolioAssessmentPage,
  decodePortfolioAssessmentRow,
  decodePortfolioPage,
  decodePortfolioRow,
  decodeProvenanceRow,
  decodeSavedComparisonRow,
  decodeWorkspaceRow,
  parseLiveTenantBinding,
  type LiveTenantBinding,
} from "@/repositories/supabase-postgres/live-row-decoders";
import { isLiveReadGatewayOperation } from "@/repositories/supabase-postgres/rpc-surface";

function requireLiveTenantBinding(context: AuthorizationContext): LiveTenantBinding {
  return parseLiveTenantBinding({
    tenantId: context.tenant.id,
    tenantPublicRef: context.tenantPublicRef,
  });
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
}

function cloneFrozen<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

function withoutPrivateNotes<T>(value: T): T {
  const safe = structuredClone(value) as T & Record<string, unknown>;
  delete safe.notes;
  return deepFreeze(safe);
}

const FORBIDDEN_SNAPSHOT_KEYS = new Set([
  "tenantId",
  "principalId",
  "organizationId",
  "evidenceId",
  "provenanceId",
  "assessmentId",
  "overlayId",
  "privateNotes",
  "notes",
]);

const RAW_REFERENCE_VALUE =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|(?:tenant|principal|org|ev|prov|assess|overlay|ledger|rule|cap|portfolio)_[a-z0-9_]+)$/i;

function assertSafeSnapshotContent(value: unknown, depth = 0): void {
  if (depth > 20) throw new RepositoryError("INVALID_RESPONSE");
  if (typeof value === "string" && RAW_REFERENCE_VALUE.test(value)) {
    throw new RepositoryError("INVALID_RESPONSE");
  }
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value) && value.length > 500) {
    throw new RepositoryError("INVALID_RESPONSE");
  }
  if (!Array.isArray(value) && Object.keys(value).length > 200) {
    throw new RepositoryError("INVALID_RESPONSE");
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_SNAPSHOT_KEYS.has(key)) throw new RepositoryError("INVALID_RESPONSE");
    assertSafeSnapshotContent(child, depth + 1);
  }
}

function assertSafeSnapshotRecord(snapshot: BriefSnapshotRecord): void {
  if (JSON.stringify(snapshot.content).length > 262_144) {
    throw new RepositoryError("INVALID_RESPONSE");
  }
  assertSafeSnapshotContent(snapshot.content);
}

function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new RepositoryError("INVALID_QUERY");
  return parsed.data;
}

function parseIdentifier<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new RepositoryError("INVALID_QUERY");
  return parsed.data;
}

function authorize(
  context: AuthorizationContext,
  ...actions: Parameters<typeof assertPermission>[1][]
) {
  try {
    for (const action of actions) assertPermission(context, action);
  } catch (error) {
    throw classifyRepositoryError(error);
  }
}

function assertTenantScoped(value: unknown, binding: LiveTenantBinding): void {
  if (value === null || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (typeof record.tenantId === "string" && record.tenantId !== binding.tenantId) {
    throw new RepositoryError("INVALID_RESPONSE");
  }
  if (
    typeof record.tenantPublicRef === "string" &&
    record.tenantPublicRef !== binding.tenantPublicRef
  ) {
    throw new RepositoryError("INVALID_RESPONSE");
  }
  for (const child of Object.values(record)) {
    assertTenantScoped(child, binding);
  }
}

function assertPageBounds(value: unknown, maxPageSize: number): void {
  if (value === null || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (typeof record.pageSize === "number" && record.pageSize > maxPageSize) {
    throw new RepositoryError("INVALID_QUERY");
  }
  if (typeof record.page === "number" && (record.page < 1 || record.page > 10_000)) {
    throw new RepositoryError("INVALID_QUERY");
  }
  for (const child of Object.values(record)) assertPageBounds(child, maxPageSize);
}

function assertPagedResponse(value: unknown, maxPageSize: number): void {
  if (value === null || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (!("items" in record && "page" in record && "pageSize" in record && "total" in record)) return;
  if (
    !Array.isArray(record.items) ||
    typeof record.page !== "number" ||
    !Number.isInteger(record.page) ||
    record.page < 1 ||
    typeof record.pageSize !== "number" ||
    !Number.isInteger(record.pageSize) ||
    record.pageSize < 1 ||
    record.pageSize > maxPageSize ||
    record.items.length > record.pageSize ||
    typeof record.total !== "number" ||
    !Number.isInteger(record.total) ||
    record.total < 0
  ) {
    throw new RepositoryError("INVALID_RESPONSE");
  }
}

type OperationLimits = Readonly<{
  requestTimeoutMs: number;
  maxPageSize: number;
}>;

class OperationRunner {
  constructor(
    private readonly config: OperationLimits,
    private readonly gateway: SupabasePostgresGateway,
  ) {}

  async execute<K extends RepositoryOperation>(
    context: AuthorizationContext,
    operation: K,
    input: RepositoryOperationMap[K]["input"],
  ): Promise<RepositoryOperationMap[K]["output"]> {
    if (!isLiveReadGatewayOperation(operation)) {
      throw new RepositoryError("UNSUPPORTED_OPERATION");
    }
    const binding = requireLiveTenantBinding(context);
    assertPageBounds(input, this.config.maxPageSize);
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new RepositoryError("TIMEOUT"));
      }, this.config.requestTimeoutMs);
    });

    try {
      const result = await Promise.race([
        this.gateway.execute(
          Object.freeze({
            operation,
            authorization: gatewayAuthorization(context),
            input: cloneFrozen(input),
            signal: controller.signal,
          }),
        ),
        timeoutPromise,
      ]);
      assertTenantScoped(result, binding);
      assertPagedResponse(result, this.config.maxPageSize);
      return cloneFrozen(result);
    } catch (error) {
      throw classifyRepositoryError(error);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}

class ProductionWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly runner: OperationRunner) {}

  async getCurrent(context: AuthorizationContext): Promise<WorkspaceContextRecord> {
    authorize(context, "organization:read");
    const binding = requireLiveTenantBinding(context);
    const raw = await this.runner.execute(context, "workspace.get", {});
    return decodeWorkspaceRow(raw, binding);
  }
}

class ProductionOrganizationRepository implements OrganizationRepository {
  constructor(private readonly runner: OperationRunner) {}

  async getById(context: AuthorizationContext, organizationId: OrganizationId) {
    authorize(context, "organization:read");
    const binding = requireLiveTenantBinding(context);
    const id = parseIdentifier(OrganizationIdSchema, organizationId);
    const raw = await this.runner.execute(context, "organizations.getById", {
      organizationId: id,
    });
    return decodeOrganizationRow(raw, binding);
  }

  async getByPublicRef(context: AuthorizationContext, organizationRef: OrganizationPublicRef) {
    authorize(context, "organization:read");
    const binding = requireLiveTenantBinding(context);
    const parsed = OrganizationPublicRefSchema.safeParse(organizationRef);
    if (!parsed.success) throw new RepositoryError("NOT_FOUND");
    const raw = await this.runner.execute(context, "organizations.getByPublicRef", {
      organizationRef: parsed.data,
    });
    return decodeOrganizationRow(raw, binding);
  }

  async list(context: AuthorizationContext, query: OrganizationQueryInput) {
    authorize(context, "organization:read");
    const binding = requireLiveTenantBinding(context);
    const raw = await this.runner.execute(
      context,
      "organizations.list",
      parseInput(OrganizationQuerySchema, query),
    );
    return decodeOrganizationPage(raw, binding);
  }

  async count(context: AuthorizationContext, query: OrganizationQueryInput) {
    authorize(context, "organization:read");
    requireLiveTenantBinding(context);
    const raw = await this.runner.execute(
      context,
      "organizations.count",
      parseInput(OrganizationQuerySchema, query),
    );
    return decodeOrganizationCount(raw);
  }

  async listEvidence(
    context: AuthorizationContext,
    organizationId: OrganizationId,
    query: EvidenceQueryInput,
  ): Promise<PagedResult<EvidenceRecord>> {
    authorize(context, "organization:read", "evidence:read");
    const binding = requireLiveTenantBinding(context);
    const id = parseIdentifier(OrganizationIdSchema, organizationId);
    const raw = await this.runner.execute(context, "evidence.listByOrganization", {
      organizationId: id,
      query: parseInput(EvidenceQuerySchema, query),
      sortField: "id",
    });
    const result = decodeEvidencePage(raw, binding, id);
    if (
      !context.permissions.includes("evidence:restricted_read") &&
      result.items.some(
        (item) =>
          item.publicationEligibility === "restricted" || item.dataClassification === "restricted",
      )
    ) {
      throw new RepositoryError("INVALID_RESPONSE");
    }
    return result;
  }

  async getProvenance(
    context: AuthorizationContext,
    provenanceId: ProvenanceId,
  ): Promise<ProvenanceRecord> {
    authorize(context, "evidence:read");
    const binding = requireLiveTenantBinding(context);
    const raw = await this.runner.execute(context, "provenance.getById", {
      provenanceId: parseIdentifier(ProvenanceIdSchema, provenanceId),
    });
    const result = decodeProvenanceRow(raw, binding);
    if (
      result.accessClassification === "restricted" &&
      !context.permissions.includes("evidence:restricted_read")
    ) {
      throw new RepositoryError("NOT_FOUND");
    }
    return withoutPrivateNotes(result);
  }

  async listCapabilities(
    context: AuthorizationContext,
    query: CapabilityQueryInput,
  ): Promise<PagedResult<Capability>> {
    authorize(context, "methodology:read");
    const binding = requireLiveTenantBinding(context);
    const raw = await this.runner.execute(context, "capabilities.list", {
      query: parseInput(CapabilityQuerySchema, query),
      sortField: "id",
    });
    return decodeCapabilityPage(raw, binding);
  }
}

class ProductionAssessmentRepository implements AssessmentRepository {
  constructor(private readonly runner: OperationRunner) {}

  async getCapabilityAssessment(context: AuthorizationContext, assessmentId: AssessmentId) {
    authorize(context, "assessment:read");
    const binding = requireLiveTenantBinding(context);
    const raw = await this.runner.execute(context, "assessments.getCapability", {
      assessmentId: parseIdentifier(AssessmentIdSchema, assessmentId),
    });
    return decodeCapabilityAssessmentRow(raw, binding);
  }

  async listCapabilityAssessments(
    context: AuthorizationContext,
    query: AssessmentListQueryInput,
  ): Promise<PagedResult<CapabilityAssessment>> {
    authorize(context, "assessment:read");
    const binding = requireLiveTenantBinding(context);
    const raw = await this.runner.execute(context, "assessments.listCapabilities", {
      query: parseInput(AssessmentListQuerySchema, query),
      sortField: "id",
    });
    return decodeCapabilityAssessmentPage(raw, binding);
  }

  async getPortfolioAssessment(context: AuthorizationContext, assessmentId: AssessmentId) {
    authorize(context, "assessment:read");
    const binding = requireLiveTenantBinding(context);
    const raw = await this.runner.execute(context, "assessments.getPortfolio", {
      assessmentId: parseIdentifier(AssessmentIdSchema, assessmentId),
    });
    return decodePortfolioAssessmentRow(raw, binding);
  }

  async listPortfolioAssessments(
    context: AuthorizationContext,
    query: AssessmentListQueryInput,
  ): Promise<PagedResult<PortfolioAssessment>> {
    authorize(context, "assessment:read");
    const binding = requireLiveTenantBinding(context);
    const raw = await this.runner.execute(context, "assessments.listPortfolios", {
      query: parseInput(AssessmentListQuerySchema, query),
      sortField: "id",
    });
    return decodePortfolioAssessmentPage(raw, binding);
  }

  async getAssessmentLedger(
    context: AuthorizationContext,
    assessmentId: AssessmentId,
  ): Promise<readonly RuleLedgerEntry[]> {
    authorize(context, "assessment:read");
    const binding = requireLiveTenantBinding(context);
    const raw = await this.runner.execute(context, "assessments.getLedger", {
      assessmentId: parseIdentifier(AssessmentIdSchema, assessmentId),
    });
    return decodeLedgerEntries(raw, binding);
  }

  async getAssessmentManifest(
    context: AuthorizationContext,
    assessmentId: AssessmentId,
  ): Promise<AssessmentManifest> {
    authorize(context, "assessment:read");
    requireLiveTenantBinding(context);
    const raw = await this.runner.execute(context, "assessments.getManifest", {
      assessmentId: parseIdentifier(AssessmentIdSchema, assessmentId),
    });
    return decodeAssessmentManifest(raw);
  }

  async getOpportunityContext(
    context: AuthorizationContext,
    organizationId: OrganizationId,
    capabilityId: CapabilityId,
  ): Promise<OpportunityContext> {
    authorize(context, "assessment:read", "overlay:read");
    requireLiveTenantBinding(context);
    const raw = await this.runner.execute(context, "assessments.getOpportunityContext", {
      organizationId: parseIdentifier(OrganizationIdSchema, organizationId),
      capabilityId: parseIdentifier(CapabilityIdSchema, capabilityId),
    });
    return decodeOpportunityContext(raw);
  }
}

class ProductionPortfolioRepository implements PortfolioRepository {
  constructor(private readonly runner: OperationRunner) {}

  async getById(
    context: AuthorizationContext,
    portfolioId: PortfolioId,
  ): Promise<CapabilityPortfolio> {
    authorize(context, "assessment:read");
    const binding = requireLiveTenantBinding(context);
    const raw = await this.runner.execute(context, "portfolios.getById", {
      portfolioId: parseIdentifier(PortfolioIdSchema, portfolioId),
    });
    return decodePortfolioRow(raw, binding);
  }

  async list(
    context: AuthorizationContext,
    query: PortfolioListQueryInput,
  ): Promise<PagedResult<CapabilityPortfolio>> {
    authorize(context, "assessment:read");
    const binding = requireLiveTenantBinding(context);
    const raw = await this.runner.execute(context, "portfolios.list", {
      query: parseInput(PortfolioListQuerySchema, query),
      sortField: "id",
    });
    return decodePortfolioPage(raw, binding);
  }
}

class ProductionOverlayRepository implements OverlayRepository {
  constructor(private readonly runner: OperationRunner) {}

  async getById(context: AuthorizationContext, overlayId: OverlayId): Promise<OrganizationOverlay> {
    authorize(context, "overlay:read");
    const binding = requireLiveTenantBinding(context);
    const raw = await this.runner.execute(context, "overlays.getById", {
      overlayId: parseIdentifier(OverlayIdSchema, overlayId),
    });
    return withoutPrivateNotes(decodeOverlayRow(raw, binding));
  }

  async getByOrganizationId(
    context: AuthorizationContext,
    organizationId: OrganizationId,
  ): Promise<OrganizationOverlay> {
    authorize(context, "overlay:read");
    const binding = requireLiveTenantBinding(context);
    const raw = await this.runner.execute(context, "overlays.getByOrganizationId", {
      organizationId: parseIdentifier(OrganizationIdSchema, organizationId),
    });
    return withoutPrivateNotes(decodeOverlayRow(raw, binding));
  }

  async list(
    context: AuthorizationContext,
    query: OverlayListQueryInput,
  ): Promise<PagedResult<OrganizationOverlay>> {
    authorize(context, "overlay:read");
    const binding = requireLiveTenantBinding(context);
    const raw = await this.runner.execute(context, "overlays.list", {
      query: parseInput(OverlayListQuerySchema, query),
      sortField: "id",
    });
    const result = decodeOverlayPage(raw, binding);
    return Object.freeze({
      ...result,
      items: Object.freeze(result.items.map(withoutPrivateNotes)),
    });
  }
}

class ProductionSavedComparisonRepository implements SavedComparisonRepository {
  constructor(private readonly runner: OperationRunner) {}

  async getByPublicRef(
    context: AuthorizationContext,
    comparisonRef: SavedComparisonRecord["publicRef"],
  ): Promise<SavedComparisonRecord> {
    authorize(context, "organization:read", "assessment:read");
    const parsed = SavedComparisonPublicRefSchema.safeParse(comparisonRef);
    if (!parsed.success) throw new RepositoryError("NOT_FOUND");
    const binding = requireLiveTenantBinding(context);
    const raw = await this.runner.execute(context, "comparisons.getByPublicRef", {
      comparisonRef: parsed.data,
    });
    return decodeSavedComparisonRow(raw, binding);
  }

  async list(
    context: AuthorizationContext,
    query: SavedComparisonListQueryInput,
  ): Promise<PagedResult<SavedComparisonRecord>> {
    authorize(context, "organization:read", "assessment:read");
    const binding = requireLiveTenantBinding(context);
    const raw = await this.runner.execute(
      context,
      "comparisons.list",
      parseInput(SavedComparisonListQuerySchema, query),
    );
    return decodeComparisonPage(raw, binding);
  }
}

class ProductionBriefSnapshotRepository implements BriefSnapshotRepository {
  constructor(private readonly runner: OperationRunner) {}

  async getByPublicRef(
    context: AuthorizationContext,
    briefSnapshotRef: BriefSnapshotRecord["publicRef"],
  ): Promise<BriefSnapshotRecord> {
    authorize(context, "brief:read");
    const parsed = BriefSnapshotPublicRefSchema.safeParse(briefSnapshotRef);
    if (!parsed.success) throw new RepositoryError("NOT_FOUND");
    const binding = requireLiveTenantBinding(context);
    const raw = await this.runner.execute(context, "briefSnapshots.getByPublicRef", {
      briefSnapshotRef: parsed.data,
    });
    const snapshot = decodeBriefSnapshotRow(raw, binding);
    assertSafeSnapshotRecord(snapshot);
    return snapshot;
  }

  async list(
    context: AuthorizationContext,
    query: BriefSnapshotListQueryInput,
  ): Promise<PagedResult<BriefSnapshotRecord>> {
    authorize(context, "brief:read");
    const binding = requireLiveTenantBinding(context);
    const raw = await this.runner.execute(
      context,
      "briefSnapshots.list",
      parseInput(BriefSnapshotListQuerySchema, query),
    );
    const page = decodeBriefPage(raw, binding);
    for (const item of page.items) assertSafeSnapshotRecord(item);
    return page;
  }
}

export function createSupabasePostgresRepositoryBundle(
  config: ProductionRepositoryConfig,
  gateway: SupabasePostgresGateway,
): RepositoryBundle {
  const runner = new OperationRunner(
    Object.freeze({
      requestTimeoutMs: config.requestTimeoutMs,
      maxPageSize: config.maxPageSize,
    }),
    gateway,
  );
  return Object.freeze({
    adapter: "supabase-postgres",
    workspace: new ProductionWorkspaceRepository(runner),
    organizations: new ProductionOrganizationRepository(runner),
    assessments: new ProductionAssessmentRepository(runner),
    portfolios: new ProductionPortfolioRepository(runner),
    overlays: new ProductionOverlayRepository(runner),
    comparisons: new ProductionSavedComparisonRepository(runner),
    briefSnapshots: new ProductionBriefSnapshotRepository(runner),
    documents: new UnsupportedDocumentRepository(),
  });
}
