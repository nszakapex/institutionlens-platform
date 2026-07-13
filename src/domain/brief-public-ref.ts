/**
 * Tenant-scoped brief route references.
 *
 * BriefPublicRef is NOT an authorization boundary. It is a stable, URL-safe
 * handle that avoids exposing internal OrganizationId values. Resolution always
 * requires a validated AuthorizationContext, brief:read (+ org/assessment read),
 * and tenant-scoped lookup within context.tenant.id.
 *
 * Synthetic refs are deterministic SHA-256 truncations of
 * `tenantId:organizationId` under a fixed salt. Tenant id is included so the
 * same internal organization id cannot be correlated across tenants via a
 * shared bref_ URL token. Refs are not derived from display names.
 */

import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import type { OrganizationId } from "@/domain/ids";

const PUBLIC_REF_PREFIX = "bref_";
const DIGEST_LENGTH = 20;
const MIN_LENGTH = PUBLIC_REF_PREFIX.length + 16;
const MAX_LENGTH = PUBLIC_REF_PREFIX.length + 32;

/** Opaque public brief route reference — never treat as authorization. */
export const BriefPublicRefSchema = z
  .string()
  .min(MIN_LENGTH)
  .max(MAX_LENGTH)
  .regex(/^bref_[a-f0-9]{16,32}$/, "Expected bref_ + lowercase hex digest");

export type BriefPublicRef = z.infer<typeof BriefPublicRefSchema>;

const SALT = "il:brief-public-ref:v1";

/**
 * Deterministic synthetic brief reference for a known organization id within a tenant.
 * Phase 8 models one brief per organization per tenant.
 */
export function briefPublicRefFor(
  tenantId: string,
  organizationId: OrganizationId | string,
): BriefPublicRef {
  if (!tenantId || typeof tenantId !== "string") {
    throw new Error("briefPublicRefFor requires a non-empty tenant id.");
  }
  const digest = createHash("sha256")
    .update(`${SALT}:${tenantId}:${organizationId}`, "utf8")
    .digest("hex")
    .slice(0, DIGEST_LENGTH);
  return BriefPublicRefSchema.parse(`${PUBLIC_REF_PREFIX}${digest}`);
}

export function parseBriefPublicRef(input: unknown): BriefPublicRef | null {
  const parsed = BriefPublicRefSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export function isBriefPublicRef(value: unknown): value is BriefPublicRef {
  return BriefPublicRefSchema.safeParse(value).success;
}
