import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { documentPublicRefFor } from "@/domain/document-public-ref";
import { organizationPublicRefFor } from "@/domain/organization-public-ref";
import {
  DOCUMENT_CLASSIFICATION_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_UPLOAD_ALLOWLIST,
  MAX_DOCUMENT_BYTES,
  type DocumentClassification,
} from "@/domain/schemas/document";
import type { RepositoryBundle } from "@/repositories/repository-contracts";
import type {
  DocumentOrgOption,
  DocumentRowView,
  DocumentsPageView,
} from "@/application/document-view-models";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      if (child && typeof child === "object" && !Object.isFrozen(child)) {
        deepFreeze(child);
      }
    }
  }
  return value;
}

export async function buildDocumentsPageView(
  context: AuthorizationContext,
  repositories: RepositoryBundle,
): Promise<DocumentsPageView> {
  if (!context.permissions.includes("document:read")) {
    return deepFreeze({
      state: "unauthorized",
      stateMessage: "This workspace cannot load tenant documents.",
      rows: [],
      total: 0,
      canUpload: false,
      canLink: false,
      organizationOptions: [],
      classificationOptions: [],
      allowedExtensionsLabel: Object.keys(DOCUMENT_UPLOAD_ALLOWLIST).join(", "),
      maxBytesLabel: formatBytes(MAX_DOCUMENT_BYTES),
    });
  }

  try {
    const listed = await repositories.documents.list(context, { page: 1, pageSize: 50 });
    const orgs = await repositories.organizations.list(context, {
      page: 1,
      pageSize: 50,
      sortField: "displayName",
      sortDirection: "asc",
    });

    const orgNameById = new Map(orgs.items.map((org) => [org.id, org.displayName] as const));
    const organizationOptions: DocumentOrgOption[] = orgs.items.map((org) =>
      Object.freeze({
        organizationPublicRef: organizationPublicRefFor(org.id),
        label: org.displayName,
      }),
    );

    const rows: DocumentRowView[] = listed.items.map((doc) => {
      const orgId = doc.organizationId;
      const organizationLabel = orgId ? (orgNameById.get(orgId) ?? "Linked organization") : null;
      const organizationHref = orgId ? `/organizations/${organizationPublicRefFor(orgId)}` : null;
      return Object.freeze({
        documentPublicRef: documentPublicRefFor(context.tenant.id, doc.id),
        title: doc.title,
        originalFilename: doc.originalFilename,
        classificationLabel: DOCUMENT_CLASSIFICATION_LABELS[doc.classification],
        statusLabel: DOCUMENT_STATUS_LABELS[doc.status],
        contentType: doc.contentType,
        byteSizeLabel: formatBytes(doc.byteSize),
        organizationLabel,
        organizationHref,
        uploadedAtLabel: doc.createdAt,
        synthetic: doc.synthetic,
        notes: doc.notes ?? null,
      });
    });

    const classificationOptions = (
      Object.entries(DOCUMENT_CLASSIFICATION_LABELS) as [DocumentClassification, string][]
    ).map(([value, label]) => Object.freeze({ value, label }));

    return deepFreeze({
      state: "ready",
      stateMessage: null,
      rows,
      total: listed.total,
      canUpload: context.permissions.includes("document:upload"),
      canLink: context.permissions.includes("document:link"),
      organizationOptions,
      classificationOptions,
      allowedExtensionsLabel: Object.keys(DOCUMENT_UPLOAD_ALLOWLIST).join(", "),
      maxBytesLabel: formatBytes(MAX_DOCUMENT_BYTES),
    });
  } catch {
    return deepFreeze({
      state: "error",
      stateMessage: "Tenant documents could not be loaded.",
      rows: [],
      total: 0,
      canUpload: false,
      canLink: false,
      organizationOptions: [],
      classificationOptions: [],
      allowedExtensionsLabel: Object.keys(DOCUMENT_UPLOAD_ALLOWLIST).join(", "),
      maxBytesLabel: formatBytes(MAX_DOCUMENT_BYTES),
    });
  }
}
