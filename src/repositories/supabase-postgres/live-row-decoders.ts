import "server-only";

import { z } from "zod";
import {
  AdapterVersionSchema,
  EvidenceIdSchema,
  OrganizationIdSchema,
  ProvenanceIdSchema,
  TenantIdSchema,
  VerticalIdSchema,
} from "@/domain/ids";
import {
  OrganizationPublicRefSchema,
  type OrganizationPublicRef,
} from "@/domain/organization-public-ref";
import {
  ConfidenceLevelSchema,
  FreshnessStatusSchema,
  PublicationEligibilitySchema,
} from "@/domain/schemas/assessment";
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
  BriefSnapshotPublicRefSchema,
  BriefSnapshotRecordSchema,
  SavedComparisonPublicRefSchema,
  SavedComparisonRecordSchema,
  type BriefSnapshotRecord,
  type SavedComparisonRecord,
} from "@/repositories/repository-contracts";
import { RepositoryError } from "@/repositories/repository-errors";

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

export type { OrganizationPublicRef };
