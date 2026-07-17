import "server-only";

import { z } from "zod";
import {
  AdapterVersionSchema,
  AssessmentIdSchema,
  CapabilityIdSchema,
  EvidenceIdSchema,
  OrganizationIdSchema,
  OverlayIdSchema,
  PortfolioIdSchema,
  ProvenanceIdSchema,
  RuleSetIdSchema,
  TenantIdSchema,
  VerticalIdSchema,
} from "@/domain/ids";
import {
  OrganizationPublicRefSchema,
  type OrganizationPublicRef,
} from "@/domain/organization-public-ref";
import { AssessmentManifestSchema, type AssessmentManifest } from "@/domain/assessments/manifest";
import { RuleLedgerEntrySchema, type RuleLedgerEntry } from "@/domain/assessments/ledger";
import {
  CapabilityAssessmentSchema,
  OpportunityContextSchema,
  PortfolioAssessmentSchema,
  type CapabilityAssessment,
  type OpportunityContext,
  type PortfolioAssessment,
} from "@/domain/assessments/results";
import { OrganizationOverlaySchema, type OrganizationOverlay } from "@/domain/overlays/schemas";
import { CapabilityPortfolioSchema, type CapabilityPortfolio } from "@/domain/portfolios/schemas";
import {
  CompletenessStatusSchema,
  ConfidenceLevelSchema,
  FitAssessmentSchema,
  FreshnessStatusSchema,
  ObservedFitBandSchema,
  PublicationEligibilitySchema,
} from "@/domain/schemas/assessment";
import { CapabilitySchema, type Capability } from "@/domain/schemas/capability";
import {
  BoundedTagsSchema,
  DataClassificationSchema,
  ExternalReferenceSchema,
  IsoDateTimeSchema,
  LifecycleStatusSchema,
  LocationSchema,
} from "@/domain/schemas/common";
import {
  EvidenceRecordSchema,
  EvidenceTypeSchema,
  EpistemicStatusSchema,
  type EvidenceRecord,
} from "@/domain/schemas/evidence";
import { ObservationValueSchema } from "@/domain/schemas/observation";
import { OrganizationSchema, type Organization } from "@/domain/schemas/organization";
import {
  AccessClassificationSchema,
  LicenseStatusSchema,
  ProvenanceRecordSchema,
  SourceTypeSchema,
  ValidationStatusSchema,
  type ProvenanceRecord,
} from "@/domain/schemas/provenance";
import {
  BriefSnapshotPublicRefSchema,
  BriefSnapshotRecordSchema,
  SavedComparisonPublicRefSchema,
  SavedComparisonRecordSchema,
  type BriefSnapshotRecord,
  type SavedComparisonRecord,
  type WorkspaceContextRecord,
} from "@/repositories/repository-contracts";
import { RepositoryError } from "@/repositories/repository-errors";
import { isMembershipRole, mapMembershipRole } from "@/authorization/membership-role";

export const TenantPublicRefSchema = z
  .string()
  .min(25)
  .max(37)
  .regex(/^tref_[a-f0-9]{20,32}$/);

export type TenantPublicRef = z.infer<typeof TenantPublicRefSchema>;

/**
 * Server-authenticated tenant binding for live RPC decode.
 * `tenantPublicRef` must come from session binding, never client query input.
 */
export type LiveTenantBinding = Readonly<{
  tenantId: string;
  tenantPublicRef: TenantPublicRef;
}>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FORBIDDEN_WIRE_KEYS = new Set([
  "tenantId",
  "tenant_id",
  "organization_id",
  "evidence_id",
  "provenance_id",
  "privateNotes",
  "private_notes",
  "notes",
  "sourceReference",
  "source_reference",
  "userId",
  "user_id",
  "membershipId",
  "createdByMembershipId",
  "approvedByMembershipId",
  "assessmentRunId",
  "importRunId",
  "sourceManifest",
  "source_manifest",
]);

function assertNoForbiddenKeys(value: unknown, depth = 0): void {
  if (depth > 24) throw new RepositoryError("INVALID_RESPONSE");
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    if (value.length > 500) throw new RepositoryError("INVALID_RESPONSE");
    for (const child of value) assertNoForbiddenKeys(child, depth + 1);
    return;
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length > 200) throw new RepositoryError("INVALID_RESPONSE");
  for (const [key, child] of Object.entries(record)) {
    if (FORBIDDEN_WIRE_KEYS.has(key)) throw new RepositoryError("INVALID_RESPONSE");
    if (UUID_PATTERN.test(key)) throw new RepositoryError("INVALID_RESPONSE");
    if (typeof child === "string" && UUID_PATTERN.test(child) && key !== "contentFingerprint") {
      throw new RepositoryError("INVALID_RESPONSE");
    }
    assertNoForbiddenKeys(child, depth + 1);
  }
}

/**
 * Page envelopes may include item rows that still carry wire `tenantId`
 * for binding checks. Strip+assert those per row; only scan the envelope here.
 */
function assertPageEnvelopeNoForbiddenKeys(raw: unknown): void {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new RepositoryError("INVALID_RESPONSE");
  }
  const record = raw as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    if (key === "items") continue;
    if (FORBIDDEN_WIRE_KEYS.has(key) || UUID_PATTERN.test(key)) {
      throw new RepositoryError("INVALID_RESPONSE");
    }
    assertNoForbiddenKeys(child);
  }
}

function rejectNullProjection(value: unknown): asserts value is Record<string, unknown> {
  if (value === null || value === undefined) throw new RepositoryError("NOT_FOUND");
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new RepositoryError("INVALID_RESPONSE");
  }
}

const OrganizationWireSchema = z
  .object({
    tenantPublicRef: TenantPublicRefSchema,
    id: OrganizationIdSchema,
    publicRef: OrganizationPublicRefSchema,
    verticalId: VerticalIdSchema,
    adapterVersion: AdapterVersionSchema,
    displayName: z.string().min(1).max(160),
    legalName: z.string().min(1).max(200).optional().nullable(),
    organizationType: z.string().min(1).max(64),
    lifecycleStatus: LifecycleStatusSchema,
    primaryLocation: LocationSchema,
    summary: z.string().min(1).max(600),
    tags: BoundedTagsSchema,
    externalReferences: z.array(ExternalReferenceSchema).max(8),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    synthetic: z.boolean(),
    dataClassification: DataClassificationSchema,
    fit: z.object({ status: z.literal("unassessed") }).strict(),
    domainSchemaVersion: z.literal("1.0.0"),
    verticalPayload: z.record(z.string(), z.unknown()),
  })
  .strict();

const EvidenceWireSchema = z
  .object({
    tenantPublicRef: TenantPublicRefSchema,
    id: EvidenceIdSchema,
    organizationId: OrganizationIdSchema,
    verticalId: VerticalIdSchema,
    adapterVersion: AdapterVersionSchema,
    evidenceType: EvidenceTypeSchema,
    epistemicStatus: EpistemicStatusSchema,
    title: z.string().min(1).max(160),
    summary: z.string().min(1).max(600),
    observation: ObservationValueSchema.nullable(),
    observedAt: IsoDateTimeSchema.nullable().optional(),
    effectivePeriod: z
      .object({
        start: IsoDateTimeSchema.optional(),
        end: IsoDateTimeSchema.optional(),
      })
      .strict()
      .nullable()
      .optional(),
    freshness: FreshnessStatusSchema,
    confidence: ConfidenceLevelSchema,
    provenanceId: ProvenanceIdSchema.nullable().optional(),
    publicationEligibility: PublicationEligibilitySchema,
    synthetic: z.boolean(),
    dataClassification: DataClassificationSchema,
    calculatedFromEvidenceIds: z.array(EvidenceIdSchema).max(20).optional(),
    calculationDescriptor: z.string().min(1).max(200).optional().nullable(),
    ruleSetRef: z.string().min(1).max(120).optional().nullable(),
    stalenessReason: z.string().min(1).max(240).optional().nullable(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    domainSchemaVersion: z.literal("1.0.0"),
  })
  .strict();

const ComparisonWireSchema = z
  .object({
    tenantPublicRef: TenantPublicRefSchema,
    publicRef: SavedComparisonPublicRefSchema,
    name: z.string().min(1).max(120),
    status: z.enum(["active", "archived"]),
    organizationRefs: z.array(OrganizationPublicRefSchema).min(2).max(3),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

const BriefWireSchema = z
  .object({
    tenantPublicRef: TenantPublicRefSchema,
    publicRef: BriefSnapshotPublicRefSchema,
    organizationRef: OrganizationPublicRefSchema,
    state: z.enum(["draft", "approved", "archived"]),
    templateVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    publicationEligibility: PublicationEligibilitySchema,
    contentFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    content: z.record(z.string(), z.json()),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

const PagedWireSchema = z
  .object({
    items: z.array(z.unknown()).max(50),
    page: z.number().int().min(1).max(10_000),
    pageSize: z.number().int().min(1).max(50),
    total: z.number().int().min(0),
  })
  .strict();

/**
 * Validate wire tenant discriminator against server-authenticated binding, then strip it
 * and stamp the domain tenantId. Never trusts client-supplied tenant identifiers.
 */
function bindAndStripTenantPublicRef<T extends { tenantPublicRef: string }>(
  wire: T,
  binding: LiveTenantBinding,
): Omit<T, "tenantPublicRef"> & { tenantId: string } {
  if (wire.tenantPublicRef !== binding.tenantPublicRef) {
    throw new RepositoryError("INVALID_RESPONSE");
  }
  const { tenantPublicRef, ...rest } = wire;
  void tenantPublicRef;
  return { ...rest, tenantId: TenantIdSchema.parse(binding.tenantId) };
}

function isAlreadyDomainOrganization(value: unknown, tenantId: string): value is Organization {
  const parsed = OrganizationSchema.safeParse(value);
  return parsed.success && parsed.data.tenantId === tenantId;
}

function isAlreadyDomainEvidence(value: unknown, tenantId: string): value is EvidenceRecord {
  const parsed = EvidenceRecordSchema.safeParse(value);
  return parsed.success && parsed.data.tenantId === tenantId;
}

function isAlreadyDomainComparison(
  value: unknown,
  tenantId: string,
): value is SavedComparisonRecord {
  const parsed = SavedComparisonRecordSchema.safeParse(value);
  return parsed.success && parsed.data.tenantId === tenantId;
}

function isAlreadyDomainBrief(value: unknown, tenantId: string): value is BriefSnapshotRecord {
  const parsed = BriefSnapshotRecordSchema.safeParse(value);
  return parsed.success && parsed.data.tenantId === tenantId;
}

export function parseLiveTenantBinding(input: {
  tenantId: string;
  tenantPublicRef: string | undefined;
}): LiveTenantBinding {
  const tenantId = TenantIdSchema.safeParse(input.tenantId);
  const tenantPublicRef = TenantPublicRefSchema.safeParse(input.tenantPublicRef);
  if (!tenantId.success || !tenantPublicRef.success) {
    throw new RepositoryError("MISCONFIGURED");
  }
  return Object.freeze({
    tenantId: tenantId.data,
    tenantPublicRef: tenantPublicRef.data,
  });
}

export function decodeOrganizationRow(raw: unknown, binding: LiveTenantBinding): Organization {
  if (isAlreadyDomainOrganization(raw, binding.tenantId)) return Object.freeze(raw);
  rejectNullProjection(raw);
  assertNoForbiddenKeys(raw);
  const wire = OrganizationWireSchema.safeParse(raw);
  if (!wire.success) throw new RepositoryError("INVALID_RESPONSE");
  const stamped = bindAndStripTenantPublicRef(wire.data, binding);
  const { publicRef, ...withoutPublicRef } = stamped;
  void publicRef;
  const domain = OrganizationSchema.safeParse({
    ...withoutPublicRef,
    legalName: stamped.legalName ?? undefined,
  });
  if (!domain.success) throw new RepositoryError("INVALID_RESPONSE");
  return Object.freeze(domain.data);
}

export function decodeEvidenceRow(raw: unknown, binding: LiveTenantBinding): EvidenceRecord {
  if (isAlreadyDomainEvidence(raw, binding.tenantId)) return Object.freeze(raw);
  rejectNullProjection(raw);
  assertNoForbiddenKeys(raw);
  const wire = EvidenceWireSchema.safeParse(raw);
  if (!wire.success) throw new RepositoryError("INVALID_RESPONSE");
  const stamped = bindAndStripTenantPublicRef(wire.data, binding);
  const domain = EvidenceRecordSchema.safeParse({
    ...stamped,
    observedAt: stamped.observedAt ?? null,
    effectivePeriod: stamped.effectivePeriod ?? null,
    provenanceId: stamped.provenanceId ?? null,
    calculatedFromEvidenceIds:
      stamped.calculatedFromEvidenceIds && stamped.calculatedFromEvidenceIds.length > 0
        ? stamped.calculatedFromEvidenceIds
        : undefined,
    calculationDescriptor: stamped.calculationDescriptor ?? undefined,
    ruleSetRef: stamped.ruleSetRef ?? undefined,
    stalenessReason: stamped.stalenessReason ?? undefined,
  });
  if (!domain.success) throw new RepositoryError("INVALID_RESPONSE");
  return Object.freeze(domain.data);
}

export function decodeSavedComparisonRow(
  raw: unknown,
  binding: LiveTenantBinding,
): SavedComparisonRecord {
  if (isAlreadyDomainComparison(raw, binding.tenantId)) return Object.freeze(raw);
  rejectNullProjection(raw);
  assertNoForbiddenKeys(raw);
  const wire = ComparisonWireSchema.safeParse(raw);
  if (!wire.success) throw new RepositoryError("INVALID_RESPONSE");
  if (new Set(wire.data.organizationRefs).size !== wire.data.organizationRefs.length) {
    throw new RepositoryError("INVALID_RESPONSE");
  }
  const stamped = bindAndStripTenantPublicRef(wire.data, binding);
  const domain = SavedComparisonRecordSchema.safeParse(stamped);
  if (!domain.success) throw new RepositoryError("INVALID_RESPONSE");
  return Object.freeze(domain.data);
}

export function decodeBriefSnapshotRow(
  raw: unknown,
  binding: LiveTenantBinding,
): BriefSnapshotRecord {
  if (isAlreadyDomainBrief(raw, binding.tenantId)) return Object.freeze(raw);
  rejectNullProjection(raw);
  assertNoForbiddenKeys(raw);
  const wire = BriefWireSchema.safeParse(raw);
  if (!wire.success) throw new RepositoryError("INVALID_RESPONSE");
  const stamped = bindAndStripTenantPublicRef(wire.data, binding);
  const domain = BriefSnapshotRecordSchema.safeParse(stamped);
  if (!domain.success) throw new RepositoryError("INVALID_RESPONSE");
  return Object.freeze(domain.data);
}

export function decodeOrganizationPage(
  raw: unknown,
  binding: LiveTenantBinding,
): Readonly<{
  items: readonly Organization[];
  page: number;
  pageSize: number;
  total: number;
}> {
  assertNoForbiddenKeys(raw);
  const page = PagedWireSchema.safeParse(raw);
  if (!page.success) throw new RepositoryError("INVALID_RESPONSE");
  if (page.data.items.length > page.data.pageSize) throw new RepositoryError("INVALID_RESPONSE");
  return Object.freeze({
    items: Object.freeze(page.data.items.map((item) => decodeOrganizationRow(item, binding))),
    page: page.data.page,
    pageSize: page.data.pageSize,
    total: page.data.total,
  });
}

export function decodeEvidencePage(
  raw: unknown,
  binding: LiveTenantBinding,
  organizationId?: string,
): Readonly<{
  items: readonly EvidenceRecord[];
  page: number;
  pageSize: number;
  total: number;
}> {
  assertNoForbiddenKeys(raw);
  const page = PagedWireSchema.safeParse(raw);
  if (!page.success) throw new RepositoryError("INVALID_RESPONSE");
  if (page.data.items.length > page.data.pageSize) throw new RepositoryError("INVALID_RESPONSE");
  const items = page.data.items.map((item) => decodeEvidenceRow(item, binding));
  if (organizationId && items.some((item) => item.organizationId !== organizationId)) {
    throw new RepositoryError("INVALID_RESPONSE");
  }
  return Object.freeze({
    items: Object.freeze(items),
    page: page.data.page,
    pageSize: page.data.pageSize,
    total: page.data.total,
  });
}

export function decodeComparisonPage(
  raw: unknown,
  binding: LiveTenantBinding,
): Readonly<{
  items: readonly SavedComparisonRecord[];
  page: number;
  pageSize: number;
  total: number;
}> {
  assertNoForbiddenKeys(raw);
  const page = PagedWireSchema.safeParse(raw);
  if (!page.success) throw new RepositoryError("INVALID_RESPONSE");
  if (page.data.items.length > page.data.pageSize) throw new RepositoryError("INVALID_RESPONSE");
  return Object.freeze({
    items: Object.freeze(page.data.items.map((item) => decodeSavedComparisonRow(item, binding))),
    page: page.data.page,
    pageSize: page.data.pageSize,
    total: page.data.total,
  });
}

export function decodeBriefPage(
  raw: unknown,
  binding: LiveTenantBinding,
): Readonly<{
  items: readonly BriefSnapshotRecord[];
  page: number;
  pageSize: number;
  total: number;
}> {
  assertNoForbiddenKeys(raw);
  const page = PagedWireSchema.safeParse(raw);
  if (!page.success) throw new RepositoryError("INVALID_RESPONSE");
  if (page.data.items.length > page.data.pageSize) throw new RepositoryError("INVALID_RESPONSE");
  return Object.freeze({
    items: Object.freeze(page.data.items.map((item) => decodeBriefSnapshotRow(item, binding))),
    page: page.data.page,
    pageSize: page.data.pageSize,
    total: page.data.total,
  });
}

export function decodeOrganizationCount(raw: unknown): number {
  if (typeof raw === "number" && Number.isInteger(raw) && raw >= 0) return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw)) return Number(raw);
  throw new RepositoryError("INVALID_RESPONSE");
}

function stripWireTenantId(
  raw: Record<string, unknown>,
  binding: LiveTenantBinding,
): Record<string, unknown> {
  if (typeof raw.tenantId === "string" && raw.tenantId !== binding.tenantId) {
    throw new RepositoryError("INVALID_RESPONSE");
  }
  const { tenantId: _ignored, ...rest } = raw;
  void _ignored;
  return rest;
}

const WorkspaceWireSchema = z
  .object({
    tenantPublicRef: TenantPublicRefSchema,
    tenantId: TenantIdSchema,
    principalId: z.string().min(1).max(64),
    displayName: z.string().min(1).max(160),
    status: z.enum(["active", "suspended"]),
    role: z.string().min(1).max(32),
    allowedVerticalIds: z.array(z.string().min(1).max(64)).max(20),
  })
  .strict();

const ProvenanceWireSchema = z
  .object({
    tenantPublicRef: TenantPublicRefSchema,
    id: ProvenanceIdSchema,
    sourceType: SourceTypeSchema,
    sourceName: z.string().min(1).max(160),
    retrievedAt: IsoDateTimeSchema.nullable().optional(),
    publishedAt: IsoDateTimeSchema.nullable().optional(),
    reportingPeriod: z
      .object({
        start: IsoDateTimeSchema.optional(),
        end: IsoDateTimeSchema.optional(),
      })
      .strict()
      .nullable()
      .optional(),
    checksum: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable()
      .optional(),
    licenseStatus: LicenseStatusSchema,
    accessClassification: AccessClassificationSchema,
    validationStatus: ValidationStatusSchema,
    synthetic: z.boolean(),
    dataClassification: DataClassificationSchema,
    createdAt: IsoDateTimeSchema,
    domainSchemaVersion: z.literal("1.0.0"),
  })
  .strict();

const OverlayWireSchema = z
  .object({
    tenantPublicRef: TenantPublicRefSchema,
    id: OverlayIdSchema,
    organizationId: OrganizationIdSchema,
    schemaVersion: z.literal("1.0.0"),
    synthetic: z.boolean(),
    relationshipStatus: z.enum([
      "unknown",
      "prospect",
      "active_client",
      "former_client",
      "excluded",
    ]),
    capabilityUsage: z
      .array(
        z
          .object({
            capabilityId: CapabilityIdSchema,
            usageStatus: z.enum(["unknown", "not_used", "evaluating", "active", "former"]),
          })
          .strict(),
      )
      .max(12),
    matchStatus: z.enum(["unreviewed", "exact", "probable", "ambiguous", "rejected"]),
    reviewStatus: z.enum(["unreviewed", "reviewed", "needs_attention"]),
    sourceClassification: z.enum(["tenant_provided", "synthetic_demo"]),
    effectiveAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

const CapabilityAssessmentWireSchema = z
  .object({
    tenantPublicRef: TenantPublicRefSchema,
    id: AssessmentIdSchema,
    organizationId: OrganizationIdSchema,
    portfolioId: PortfolioIdSchema,
    capabilityId: CapabilityIdSchema,
    verticalId: VerticalIdSchema,
    ruleSetId: RuleSetIdSchema,
    ruleSetVersion: AdapterVersionSchema,
    schemaVersion: z.literal("1.0.0"),
    fit: FitAssessmentSchema,
    confidence: ConfidenceLevelSchema,
    freshness: FreshnessStatusSchema,
    completeness: CompletenessStatusSchema,
    publicationEligibility: PublicationEligibilitySchema,
    ledger: z.array(z.unknown()).max(40),
    assessedAt: IsoDateTimeSchema,
    engineVersion: AdapterVersionSchema,
    synthetic: z.boolean(),
  })
  .strict();

const PortfolioAssessmentWireSchema = z
  .object({
    tenantPublicRef: TenantPublicRefSchema,
    id: AssessmentIdSchema,
    organizationId: OrganizationIdSchema,
    portfolioId: PortfolioIdSchema,
    verticalId: VerticalIdSchema,
    schemaVersion: z.literal("1.0.0"),
    status: z.enum(["unassessed", "insufficient_evidence", "invalid", "superseded", "assessed"]),
    portfolioPriorityScore: z
      .object({
        pointsAwarded: z.number().int().min(0).max(10_000),
        pointsPossible: z.number().int().min(1).max(10_000),
        band: ObservedFitBandSchema,
      })
      .strict()
      .nullable(),
    bestObservedCapabilityFit: z
      .object({
        capabilityId: CapabilityIdSchema,
        fit: FitAssessmentSchema,
      })
      .strict()
      .nullable()
      .optional(),
    capabilityAssessmentIds: z.array(AssessmentIdSchema).max(20),
    contributions: z.array(z.unknown()).max(20),
    coverage: z
      .object({
        enabledCapabilityCount: z.number().int().min(0).max(20),
        assessedCapabilityCount: z.number().int().min(0).max(20),
        insufficientCapabilityCount: z.number().int().min(0).max(20),
        enabledPriorityWeight: z.number().int().min(0).max(10_000),
        assessedPriorityWeight: z.number().int().min(0).max(10_000),
        conditionalOnAssessedCapabilities: z.boolean(),
      })
      .strict(),
    confidence: ConfidenceLevelSchema,
    freshness: FreshnessStatusSchema,
    completeness: CompletenessStatusSchema,
    publicationEligibility: PublicationEligibilitySchema,
    opportunityContexts: z.array(OpportunityContextSchema).max(20),
    assessedAt: IsoDateTimeSchema,
    engineVersion: AdapterVersionSchema,
    aggregationPolicyVersion: z.literal("1.0.0"),
    synthetic: z.boolean(),
  })
  .strict();

export function decodeWorkspaceRow(
  raw: unknown,
  binding: LiveTenantBinding,
): WorkspaceContextRecord {
  rejectNullProjection(raw);
  const wire = WorkspaceWireSchema.safeParse(raw);
  if (!wire.success) throw new RepositoryError("INVALID_RESPONSE");
  if (wire.data.tenantPublicRef !== binding.tenantPublicRef) {
    throw new RepositoryError("INVALID_RESPONSE");
  }
  if (wire.data.tenantId !== binding.tenantId) {
    throw new RepositoryError("INVALID_RESPONSE");
  }
  if (!isMembershipRole(wire.data.role)) {
    throw new RepositoryError("INVALID_RESPONSE");
  }
  const mapped = mapMembershipRole(wire.data.role);
  return Object.freeze({
    tenantId: binding.tenantId,
    principalId: wire.data.principalId,
    displayName: wire.data.displayName,
    status: wire.data.status,
    role: mapped.principalRole,
    allowedVerticalIds: Object.freeze([...wire.data.allowedVerticalIds]),
    permissions: Object.freeze([...mapped.permissions]),
  });
}

function isAlreadyDomainProvenance(value: unknown, tenantId: string): value is ProvenanceRecord {
  const parsed = ProvenanceRecordSchema.safeParse(value);
  return parsed.success && parsed.data.tenantId === tenantId;
}

function isAlreadyDomainOverlay(value: unknown, tenantId: string): value is OrganizationOverlay {
  const parsed = OrganizationOverlaySchema.safeParse(value);
  return parsed.success && parsed.data.tenantId === tenantId;
}

function isAlreadyDomainCapabilityAssessment(
  value: unknown,
  tenantId: string,
): value is CapabilityAssessment {
  const parsed = CapabilityAssessmentSchema.safeParse(value);
  return parsed.success && parsed.data.tenantId === tenantId;
}

function isAlreadyDomainPortfolioAssessment(
  value: unknown,
  tenantId: string,
): value is PortfolioAssessment {
  const parsed = PortfolioAssessmentSchema.safeParse(value);
  return parsed.success && parsed.data.tenantId === tenantId;
}

export function decodeProvenanceRow(raw: unknown, binding: LiveTenantBinding): ProvenanceRecord {
  if (isAlreadyDomainProvenance(raw, binding.tenantId)) return Object.freeze(raw);
  rejectNullProjection(raw);
  const cleaned = stripWireTenantId(raw, binding);
  assertNoForbiddenKeys(cleaned);
  const wire = ProvenanceWireSchema.safeParse(cleaned);
  if (!wire.success) throw new RepositoryError("INVALID_RESPONSE");
  const stamped = bindAndStripTenantPublicRef(wire.data, binding);
  const domain = ProvenanceRecordSchema.safeParse({
    ...stamped,
    retrievedAt: stamped.retrievedAt ?? null,
    publishedAt: stamped.publishedAt ?? null,
    reportingPeriod: stamped.reportingPeriod ?? null,
    checksum: stamped.checksum ?? null,
  });
  if (!domain.success) throw new RepositoryError("INVALID_RESPONSE");
  return Object.freeze(domain.data);
}

export function decodeOverlayRow(raw: unknown, binding: LiveTenantBinding): OrganizationOverlay {
  if (isAlreadyDomainOverlay(raw, binding.tenantId)) return Object.freeze(raw);
  rejectNullProjection(raw);
  const cleaned = stripWireTenantId(raw, binding);
  assertNoForbiddenKeys(cleaned);
  const wire = OverlayWireSchema.safeParse(cleaned);
  if (!wire.success) throw new RepositoryError("INVALID_RESPONSE");
  const stamped = bindAndStripTenantPublicRef(wire.data, binding);
  const domain = OrganizationOverlaySchema.safeParse(stamped);
  if (!domain.success) throw new RepositoryError("INVALID_RESPONSE");
  return Object.freeze(domain.data);
}

export function decodeCapabilityAssessmentRow(
  raw: unknown,
  binding: LiveTenantBinding,
): CapabilityAssessment {
  if (isAlreadyDomainCapabilityAssessment(raw, binding.tenantId)) return Object.freeze(raw);
  rejectNullProjection(raw);
  const cleaned = stripWireTenantId(raw, binding);
  assertNoForbiddenKeys(cleaned);
  const wire = CapabilityAssessmentWireSchema.safeParse(cleaned);
  if (!wire.success) throw new RepositoryError("INVALID_RESPONSE");
  const stamped = bindAndStripTenantPublicRef(wire.data, binding);
  const ledger = stamped.ledger.map((entry) => {
    if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>;
      const { tenantPublicRef: _ref, ...rest } = record;
      void _ref;
      return rest;
    }
    return entry;
  });
  const domain = CapabilityAssessmentSchema.safeParse({ ...stamped, ledger });
  if (!domain.success) throw new RepositoryError("INVALID_RESPONSE");
  return Object.freeze(domain.data);
}

export function decodePortfolioAssessmentRow(
  raw: unknown,
  binding: LiveTenantBinding,
): PortfolioAssessment {
  if (isAlreadyDomainPortfolioAssessment(raw, binding.tenantId)) return Object.freeze(raw);
  rejectNullProjection(raw);
  const cleaned = stripWireTenantId(raw, binding);
  assertNoForbiddenKeys(cleaned);
  const wire = PortfolioAssessmentWireSchema.safeParse(cleaned);
  if (!wire.success) throw new RepositoryError("INVALID_RESPONSE");
  const stamped = bindAndStripTenantPublicRef(wire.data, binding);
  const domain = PortfolioAssessmentSchema.safeParse({
    ...stamped,
    bestObservedCapabilityFit: stamped.bestObservedCapabilityFit ?? null,
    contributions: stamped.contributions,
  });
  if (!domain.success) throw new RepositoryError("INVALID_RESPONSE");
  return Object.freeze(domain.data);
}

export function decodeLedgerEntries(
  raw: unknown,
  binding: LiveTenantBinding,
): readonly RuleLedgerEntry[] {
  if (!Array.isArray(raw)) throw new RepositoryError("INVALID_RESPONSE");
  if (raw.length > 200) throw new RepositoryError("INVALID_RESPONSE");
  const items = raw.map((entry) => {
    rejectNullProjection(entry);
    if (
      typeof entry.tenantPublicRef === "string" &&
      entry.tenantPublicRef !== binding.tenantPublicRef
    ) {
      throw new RepositoryError("INVALID_RESPONSE");
    }
    const cleaned = stripWireTenantId(entry, binding);
    const { tenantPublicRef: _ref, ...withoutRef } = cleaned;
    void _ref;
    assertNoForbiddenKeys(withoutRef);
    const domain = RuleLedgerEntrySchema.safeParse(withoutRef);
    if (!domain.success) throw new RepositoryError("INVALID_RESPONSE");
    return domain.data;
  });
  return Object.freeze(items);
}

export function decodeAssessmentManifest(raw: unknown): AssessmentManifest {
  rejectNullProjection(raw);
  assertNoForbiddenKeys(raw);
  const domain = AssessmentManifestSchema.safeParse(raw);
  if (!domain.success) throw new RepositoryError("INVALID_RESPONSE");
  return Object.freeze(domain.data);
}

export function decodeOpportunityContext(raw: unknown): OpportunityContext {
  rejectNullProjection(raw);
  assertNoForbiddenKeys(raw);
  const domain = OpportunityContextSchema.safeParse(raw);
  if (!domain.success) throw new RepositoryError("INVALID_RESPONSE");
  return Object.freeze(domain.data);
}

export function decodeCapabilityPage(
  raw: unknown,
  binding: LiveTenantBinding,
): Readonly<{
  items: readonly Capability[];
  page: number;
  pageSize: number;
  total: number;
}> {
  assertPageEnvelopeNoForbiddenKeys(raw);
  const page = PagedWireSchema.safeParse(raw);
  if (!page.success) throw new RepositoryError("INVALID_RESPONSE");
  if (page.data.items.length > page.data.pageSize) throw new RepositoryError("INVALID_RESPONSE");
  const items = page.data.items.map((item) => {
    rejectNullProjection(item);
    const cleaned = stripWireTenantId(item, binding);
    assertNoForbiddenKeys(cleaned);
    const stamped =
      typeof cleaned.tenantPublicRef === "string"
        ? bindAndStripTenantPublicRef(
            cleaned as { tenantPublicRef: string } & Record<string, unknown>,
            binding,
          )
        : { ...cleaned, tenantId: binding.tenantId };
    const domain = CapabilitySchema.safeParse(stamped);
    if (!domain.success) throw new RepositoryError("INVALID_RESPONSE");
    return domain.data;
  });
  return Object.freeze({
    items: Object.freeze(items),
    page: page.data.page,
    pageSize: page.data.pageSize,
    total: page.data.total,
  });
}

export function decodePortfolioPage(
  raw: unknown,
  binding: LiveTenantBinding,
): Readonly<{
  items: readonly CapabilityPortfolio[];
  page: number;
  pageSize: number;
  total: number;
}> {
  assertPageEnvelopeNoForbiddenKeys(raw);
  const page = PagedWireSchema.safeParse(raw);
  if (!page.success) throw new RepositoryError("INVALID_RESPONSE");
  if (page.data.items.length > page.data.pageSize) throw new RepositoryError("INVALID_RESPONSE");
  const items = page.data.items.map((item) => {
    rejectNullProjection(item);
    const cleaned = stripWireTenantId(item, binding);
    assertNoForbiddenKeys(cleaned);
    const stamped =
      typeof cleaned.tenantPublicRef === "string"
        ? bindAndStripTenantPublicRef(
            cleaned as { tenantPublicRef: string } & Record<string, unknown>,
            binding,
          )
        : { ...cleaned, tenantId: binding.tenantId };
    const domain = CapabilityPortfolioSchema.safeParse(stamped);
    if (!domain.success) throw new RepositoryError("INVALID_RESPONSE");
    return domain.data;
  });
  return Object.freeze({
    items: Object.freeze(items),
    page: page.data.page,
    pageSize: page.data.pageSize,
    total: page.data.total,
  });
}

export function decodeCapabilityAssessmentPage(
  raw: unknown,
  binding: LiveTenantBinding,
): Readonly<{
  items: readonly CapabilityAssessment[];
  page: number;
  pageSize: number;
  total: number;
}> {
  assertPageEnvelopeNoForbiddenKeys(raw);
  const page = PagedWireSchema.safeParse(raw);
  if (!page.success) throw new RepositoryError("INVALID_RESPONSE");
  if (page.data.items.length > page.data.pageSize) throw new RepositoryError("INVALID_RESPONSE");
  return Object.freeze({
    items: Object.freeze(
      page.data.items.map((item) => decodeCapabilityAssessmentRow(item, binding)),
    ),
    page: page.data.page,
    pageSize: page.data.pageSize,
    total: page.data.total,
  });
}

export function decodePortfolioAssessmentPage(
  raw: unknown,
  binding: LiveTenantBinding,
): Readonly<{
  items: readonly PortfolioAssessment[];
  page: number;
  pageSize: number;
  total: number;
}> {
  assertPageEnvelopeNoForbiddenKeys(raw);
  const page = PagedWireSchema.safeParse(raw);
  if (!page.success) throw new RepositoryError("INVALID_RESPONSE");
  if (page.data.items.length > page.data.pageSize) throw new RepositoryError("INVALID_RESPONSE");
  return Object.freeze({
    items: Object.freeze(
      page.data.items.map((item) => decodePortfolioAssessmentRow(item, binding)),
    ),
    page: page.data.page,
    pageSize: page.data.pageSize,
    total: page.data.total,
  });
}

export function decodeOverlayPage(
  raw: unknown,
  binding: LiveTenantBinding,
): Readonly<{
  items: readonly OrganizationOverlay[];
  page: number;
  pageSize: number;
  total: number;
}> {
  assertPageEnvelopeNoForbiddenKeys(raw);
  const page = PagedWireSchema.safeParse(raw);
  if (!page.success) throw new RepositoryError("INVALID_RESPONSE");
  if (page.data.items.length > page.data.pageSize) throw new RepositoryError("INVALID_RESPONSE");
  return Object.freeze({
    items: Object.freeze(page.data.items.map((item) => decodeOverlayRow(item, binding))),
    page: page.data.page,
    pageSize: page.data.pageSize,
    total: page.data.total,
  });
}

export function decodePortfolioRow(raw: unknown, binding: LiveTenantBinding): CapabilityPortfolio {
  rejectNullProjection(raw);
  const cleaned = stripWireTenantId(raw, binding);
  assertNoForbiddenKeys(cleaned);
  const stamped =
    typeof cleaned.tenantPublicRef === "string"
      ? bindAndStripTenantPublicRef(
          cleaned as { tenantPublicRef: string } & Record<string, unknown>,
          binding,
        )
      : { ...cleaned, tenantId: binding.tenantId };
  const domain = CapabilityPortfolioSchema.safeParse(stamped);
  if (!domain.success) throw new RepositoryError("INVALID_RESPONSE");
  return Object.freeze(domain.data);
}

export type { OrganizationPublicRef };
