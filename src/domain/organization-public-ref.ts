/**
 * Tenant-scoped organization route references.
 *
 * OrganizationPublicRef is NOT an authorization boundary. It only provides a
 * stable, URL-safe handle that avoids exposing internal OrganizationId values
 * in HTML, RSC payloads, or navigation. Resolution always requires a validated
 * AuthorizationContext and tenant-scoped lookup.
 *
 * Synthetic refs are deterministic SHA-256 truncations of the internal org id
 * under a fixed salt. They are not derived from tenant IDs, display names, or
 * regulatory identifiers. Future database-generated refs may use the same
 * validation schema with a different generator; document any migration in
 * ORGANIZATION_DETAIL.md.
 */

import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import type { OrganizationId } from "@/domain/ids";

const PUBLIC_REF_PREFIX = "oref_";
const DIGEST_LENGTH = 20;
const MIN_LENGTH = PUBLIC_REF_PREFIX.length + 16;
const MAX_LENGTH = PUBLIC_REF_PREFIX.length + 32;

/** Opaque public route reference — never treat as authorization. */
export const OrganizationPublicRefSchema = z
  .string()
  .min(MIN_LENGTH)
  .max(MAX_LENGTH)
  .regex(/^oref_[a-f0-9]{16,32}$/, "Expected oref_ + lowercase hex digest");

export type OrganizationPublicRef = z.infer<typeof OrganizationPublicRefSchema>;

const SALT = "il:organization-public-ref:v1";

/**
 * Deterministic synthetic public reference for a known organization id.
 * Does not incorporate tenant id.
 */
export function organizationPublicRefFor(
  organizationId: OrganizationId | string,
): OrganizationPublicRef {
  const digest = createHash("sha256")
    .update(`${SALT}:${organizationId}`, "utf8")
    .digest("hex")
    .slice(0, DIGEST_LENGTH);
  return OrganizationPublicRefSchema.parse(`${PUBLIC_REF_PREFIX}${digest}`);
}

export function parseOrganizationPublicRef(input: unknown): OrganizationPublicRef | null {
  const parsed = OrganizationPublicRefSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export function isOrganizationPublicRef(value: unknown): value is OrganizationPublicRef {
  return OrganizationPublicRefSchema.safeParse(value).success;
}
