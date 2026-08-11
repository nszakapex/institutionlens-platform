import "server-only";

import { assertPermission, type AuthorizationContext } from "@/authorization/context";
import {
  documentPublicRefFor,
  DocumentPublicRefSchema,
  type DocumentPublicRef,
} from "@/domain/document-public-ref";
import { DocumentIdSchema, OrganizationIdSchema } from "@/domain/ids";
import { NotFoundError, ValidationError } from "@/domain/errors";
import {
  DOCUMENT_UPLOAD_ALLOWLIST,
  MAX_DOCUMENT_BYTES,
  TenantDocumentSchema,
  type TenantDocument,
} from "@/domain/schemas/document";
import {
  ensureTenantDocumentStore,
  newDocumentId,
  readDocumentBytes,
  readDocumentIndex,
  writeDocumentBytes,
  writeDocumentIndex,
} from "@/lib/document-storage";
import type {
  DocumentLinkInput,
  DocumentListQuery,
  DocumentRepository,
  DocumentUploadInput,
} from "@/repositories/document-repository";
import type { PagedResult } from "@/repositories/organization-repository";

function extensionOf(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx < 0) return "";
  return filename.slice(idx).toLowerCase();
}

function assertTenant(context: AuthorizationContext, row: TenantDocument): void {
  if (row.tenantId !== context.tenant.id) {
    throw new NotFoundError("Document not found.");
  }
}

function seedIfEmpty(tenantId: string, principalId: string): void {
  ensureTenantDocumentStore(tenantId);
  const existing = readDocumentIndex<TenantDocument>(tenantId);
  if (existing.length > 0) return;

  const now = "2026-04-01T12:00:00.000Z";
  const id = DocumentIdSchema.parse("doc_syn_fi_sample_note");
  const sample = new TextEncoder().encode(
    "Synthetic tenant research note for local-demo document vault validation.\n" +
      "Not a real filing. Use upload to add mortgage-analytics research materials.\n",
  );
  const stored = writeDocumentBytes(tenantId, id, sample);
  const row = TenantDocumentSchema.parse({
    id,
    tenantId,
    title: "Sample research note (synthetic)",
    originalFilename: "sample-research-note.txt",
    classification: "research_note",
    status: "uploaded",
    contentType: "text/plain",
    byteSize: sample.byteLength,
    organizationId: null,
    storageKey: stored.storageKey,
    checksumSha256: stored.checksumSha256,
    uploadedByPrincipalId: principalId,
    notes: "Seeded local-demo document — replace with tenant uploads.",
    synthetic: true,
    createdAt: now,
    updatedAt: now,
    domainSchemaVersion: "1.0.0",
  });
  writeDocumentIndex(tenantId, [row]);
}

export class SyntheticDocumentRepository implements DocumentRepository {
  async list(
    context: AuthorizationContext,
    query: DocumentListQuery = {},
  ): Promise<PagedResult<TenantDocument>> {
    assertPermission(context, "document:read");
    seedIfEmpty(context.tenant.id, context.principal.id);
    let rows = readDocumentIndex<TenantDocument>(context.tenant.id).map((row) =>
      TenantDocumentSchema.parse(row),
    );
    rows = rows.filter((row) => row.tenantId === context.tenant.id);

    if (query.status) rows = rows.filter((row) => row.status === query.status);
    if (query.classification) {
      rows = rows.filter((row) => row.classification === query.classification);
    }
    if (query.organizationId === null) {
      rows = rows.filter((row) => row.organizationId === null);
    } else if (query.organizationId) {
      rows = rows.filter((row) => row.organizationId === query.organizationId);
    }
    if (query.q?.trim()) {
      const needle = query.q.trim().toLowerCase();
      rows = rows.filter(
        (row) =>
          row.title.toLowerCase().includes(needle) ||
          row.originalFilename.toLowerCase().includes(needle),
      );
    }

    rows.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 24));
    const start = (page - 1) * pageSize;
    const items = rows.slice(start, start + pageSize);
    return Object.freeze({
      items: Object.freeze(items),
      page,
      pageSize,
      total: rows.length,
      hasMore: start + pageSize < rows.length,
    });
  }

  async getByPublicRef(
    context: AuthorizationContext,
    documentRef: DocumentPublicRef,
  ): Promise<TenantDocument> {
    assertPermission(context, "document:read");
    seedIfEmpty(context.tenant.id, context.principal.id);
    const ref = DocumentPublicRefSchema.parse(documentRef);
    const rows = readDocumentIndex<TenantDocument>(context.tenant.id);
    const match = rows.find((row) => documentPublicRefFor(context.tenant.id, row.id) === ref);
    if (!match) throw new NotFoundError("Document not found.");
    const parsed = TenantDocumentSchema.parse(match);
    assertTenant(context, parsed);
    return parsed;
  }

  async upload(context: AuthorizationContext, input: DocumentUploadInput): Promise<TenantDocument> {
    assertPermission(context, "document:upload");
    seedIfEmpty(context.tenant.id, context.principal.id);

    if (input.bytes.byteLength < 1 || input.bytes.byteLength > MAX_DOCUMENT_BYTES) {
      throw new ValidationError("Document size is outside allowed bounds.");
    }

    const ext = extensionOf(input.originalFilename);
    const expected = DOCUMENT_UPLOAD_ALLOWLIST[ext as keyof typeof DOCUMENT_UPLOAD_ALLOWLIST];
    if (!expected || expected !== input.contentType) {
      throw new ValidationError("Document type is not allowed.");
    }

    if (input.organizationId) {
      OrganizationIdSchema.parse(input.organizationId);
    }

    const id = DocumentIdSchema.parse(newDocumentId());
    const now = new Date().toISOString();
    const stored = writeDocumentBytes(context.tenant.id, id, input.bytes);
    const row = TenantDocumentSchema.parse({
      id,
      tenantId: context.tenant.id,
      title: input.title.trim().slice(0, 160),
      originalFilename: input.originalFilename.trim().slice(0, 180),
      classification: input.classification,
      status: input.organizationId ? "linked" : "uploaded",
      contentType: input.contentType,
      byteSize: input.bytes.byteLength,
      organizationId: input.organizationId ?? null,
      storageKey: stored.storageKey,
      checksumSha256: stored.checksumSha256,
      uploadedByPrincipalId: context.principal.id,
      notes: input.notes?.trim().slice(0, 240) || undefined,
      synthetic: context.tenant.demo === true,
      createdAt: now,
      updatedAt: now,
      domainSchemaVersion: "1.0.0",
    });

    const rows = readDocumentIndex<TenantDocument>(context.tenant.id);
    rows.unshift(row);
    writeDocumentIndex(context.tenant.id, rows);
    return row;
  }

  async linkOrganization(
    context: AuthorizationContext,
    input: DocumentLinkInput,
  ): Promise<TenantDocument> {
    assertPermission(context, "document:link");
    const current = await this.getByPublicRef(context, input.documentRef);
    if (input.organizationId) OrganizationIdSchema.parse(input.organizationId);

    const updated = TenantDocumentSchema.parse({
      ...current,
      organizationId: input.organizationId,
      status: input.organizationId ? "linked" : "uploaded",
      updatedAt: new Date().toISOString(),
    });

    const rows = readDocumentIndex<TenantDocument>(context.tenant.id).map((row) =>
      row.id === updated.id ? updated : row,
    );
    writeDocumentIndex(context.tenant.id, rows);
    return updated;
  }

  async readBytes(
    context: AuthorizationContext,
    documentRef: DocumentPublicRef,
  ): Promise<Uint8Array> {
    assertPermission(context, "document:read");
    const doc = await this.getByPublicRef(context, documentRef);
    return readDocumentBytes(context.tenant.id, doc.id);
  }
}
