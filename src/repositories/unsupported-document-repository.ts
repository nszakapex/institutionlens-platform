import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { assertPermission } from "@/authorization/context";
import type { DocumentPublicRef } from "@/domain/document-public-ref";
import type { TenantDocument } from "@/domain/schemas/document";
import type {
  DocumentLinkInput,
  DocumentListQuery,
  DocumentRepository,
  DocumentUploadInput,
} from "@/repositories/document-repository";
import type { PagedResult } from "@/repositories/organization-repository";
import { RepositoryError } from "@/repositories/repository-errors";

/**
 * Live Postgres adapter placeholder until privileged document write RPCs ship.
 * Fail closed — never invent document rows in production-like modes.
 */
export class UnsupportedDocumentRepository implements DocumentRepository {
  async list(
    context: AuthorizationContext,
    _query?: DocumentListQuery,
  ): Promise<PagedResult<TenantDocument>> {
    assertPermission(context, "document:read");
    throw new RepositoryError("UNSUPPORTED_OPERATION");
  }

  async getByPublicRef(
    context: AuthorizationContext,
    _documentRef: DocumentPublicRef,
  ): Promise<TenantDocument> {
    assertPermission(context, "document:read");
    throw new RepositoryError("UNSUPPORTED_OPERATION");
  }

  async upload(
    context: AuthorizationContext,
    _input: DocumentUploadInput,
  ): Promise<TenantDocument> {
    assertPermission(context, "document:upload");
    throw new RepositoryError("UNSUPPORTED_OPERATION");
  }

  async linkOrganization(
    context: AuthorizationContext,
    _input: DocumentLinkInput,
  ): Promise<TenantDocument> {
    assertPermission(context, "document:link");
    throw new RepositoryError("UNSUPPORTED_OPERATION");
  }

  async readBytes(
    context: AuthorizationContext,
    _documentRef: DocumentPublicRef,
  ): Promise<Uint8Array> {
    assertPermission(context, "document:read");
    throw new RepositoryError("UNSUPPORTED_OPERATION");
  }
}
