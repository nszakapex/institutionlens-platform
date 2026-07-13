import { z } from "zod";
import {
  OrganizationPublicRefSchema,
  type OrganizationPublicRef,
  parseOrganizationPublicRef,
} from "@/domain/organization-public-ref";
import {
  BriefPublicRefSchema,
  type BriefPublicRef,
  parseBriefPublicRef,
} from "@/domain/brief-public-ref";

/** Directory query — optional opaque organization preselection. */
export type BriefDirectoryQuery = {
  readonly orgRef: OrganizationPublicRef | null;
};

export type BriefDirectoryQueryParseResult =
  | { ok: true; query: BriefDirectoryQuery }
  | { ok: false; reason: "malformed" };

/**
 * Parse `/briefs` search params. Accepts a single opaque `org` value.
 * Empty selection is valid (directory empty/ready shell).
 */
export function parseBriefDirectorySearchParams(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): BriefDirectoryQueryParseResult {
  const raw =
    input instanceof URLSearchParams
      ? input.get("org")
      : Array.isArray(input.org)
        ? input.org[0]
        : input.org;

  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, query: { orgRef: null } };
  }

  const trimmed = String(raw).trim();
  if (!trimmed) return { ok: false, reason: "malformed" };
  const parsed = OrganizationPublicRefSchema.safeParse(trimmed);
  if (!parsed.success) return { ok: false, reason: "malformed" };
  return { ok: true, query: { orgRef: parsed.data } };
}

export function briefDirectoryHref(orgRef?: OrganizationPublicRef | string | null): string {
  if (!orgRef) return "/briefs";
  const parsed = parseOrganizationPublicRef(orgRef);
  if (!parsed) return "/briefs";
  return `/briefs?org=${parsed}`;
}

export function briefDocumentHref(briefRef: BriefPublicRef | string): string {
  const parsed = parseBriefPublicRef(briefRef);
  if (!parsed) return "/briefs";
  return `/briefs/${parsed}`;
}

export function parseBriefRouteParam(briefRef: unknown): BriefPublicRef | null {
  return parseBriefPublicRef(briefRef);
}

export const BriefDirectoryQuerySchema = z
  .object({
    orgRef: OrganizationPublicRefSchema.nullable(),
  })
  .strict();

export const BriefRouteParamSchema = BriefPublicRefSchema;
