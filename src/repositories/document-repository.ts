import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import type { DocumentPublicRef } from "@/domain/document-public-ref";
import type { OrganizationId } from "@/domain/ids";
import type {
  DocumentClassification,
  DocumentContentType,
  TenantDocument,
} from "@/domain/schemas/document";
import type { PagedResult } from "@/repositories/organization-repository";

export type DocumentListQuery = Readonly<{
  page?: number;
  pageSize?: number;
  status?: TenantDocument["status"];
  classification?: DocumentClassification;
  organizationId?: OrganizationId | null;
  q?: string;
}>;

export type DocumentUploadInput = Readonly<{
  title: string;
  originalFilename: string;
  classification: DocumentClassification;
  contentType: DocumentContentType;
  bytes: Uint8Array;
  organizationId?: OrganizationId | null;
  notes?: string;
}>;

export type DocumentLinkInput = Readonly<{
  documentRef: DocumentPublicRef;
  organizationId: OrganizationId | null;
}>;

export interface DocumentRepository {
  list(
    context: AuthorizationContext,
    query?: DocumentListQuery,
  ): Promise<PagedResult<TenantDocument>>;
  getByPublicRef(
    context: AuthorizationContext,
    documentRef: DocumentPublicRef,
  ): Promise<TenantDocument>;
  upload(context: AuthorizationContext, input: DocumentUploadInput): Promise<TenantDocument>;
  linkOrganization(
    context: AuthorizationContext,
    input: DocumentLinkInput,
  ): Promise<TenantDocument>;
  readBytes(context: AuthorizationContext, documentRef: DocumentPublicRef): Promise<Uint8Array>;
}
