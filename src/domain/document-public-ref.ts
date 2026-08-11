/**
 * Tenant-scoped document route references.
 * Opaque handle only — not an authorization boundary.
 */

import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import type { DocumentId, TenantId } from "@/domain/ids";

const PUBLIC_REF_PREFIX = "dref_";
const DIGEST_LENGTH = 20;
const MIN_LENGTH = PUBLIC_REF_PREFIX.length + 16;
const MAX_LENGTH = PUBLIC_REF_PREFIX.length + 32;

export const DocumentPublicRefSchema = z
  .string()
  .min(MIN_LENGTH)
  .max(MAX_LENGTH)
  .regex(/^dref_[a-f0-9]{16,32}$/, "Expected dref_ + lowercase hex digest");

export type DocumentPublicRef = z.infer<typeof DocumentPublicRefSchema>;

const SALT = "il:document-public-ref:v1";

export function documentPublicRefFor(
  tenantId: TenantId | string,
  documentId: DocumentId | string,
): DocumentPublicRef {
  const digest = createHash("sha256")
    .update(`${SALT}:${tenantId}:${documentId}`)
    .digest("hex")
    .slice(0, DIGEST_LENGTH);
  return DocumentPublicRefSchema.parse(`${PUBLIC_REF_PREFIX}${digest}`);
}
