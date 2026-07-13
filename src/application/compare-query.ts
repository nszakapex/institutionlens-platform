import { z } from "zod";
import {
  OrganizationPublicRefSchema,
  type OrganizationPublicRef,
  parseOrganizationPublicRef,
} from "@/domain/organization-public-ref";

/** Maximum organizations in a Phase 7 comparison. */
export const MAX_COMPARE_ORGS = 3;
/** Minimum organizations required for a ready comparison. */
export const MIN_COMPARE_ORGS = 2;

/** Canonical compare query — URL `org` params are the source of truth. */
export type CompareQuery = {
  readonly orgRefs: readonly OrganizationPublicRef[];
};

export type CompareQueryParseFailure = {
  ok: false;
  reason: "malformed" | "too_many";
};

export type CompareQueryParseSuccess = {
  ok: true;
  query: CompareQuery;
};

export type CompareQueryParseResult = CompareQueryParseSuccess | CompareQueryParseFailure;

function collectOrgParamValues(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): string[] {
  if (input instanceof URLSearchParams) {
    return input.getAll("org");
  }
  const raw = input.org;
  if (raw === undefined) return [];
  return Array.isArray(raw) ? raw : [raw];
}

/**
 * Parse compare search params into a canonical query.
 * Fail closed on malformed tokens or more than three distinct refs after dedupe.
 * Duplicates keep first occurrence order.
 */
export function parseCompareSearchParams(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): CompareQueryParseResult {
  const values = collectOrgParamValues(input);
  if (values.length === 0) {
    return { ok: true, query: { orgRefs: Object.freeze([]) } };
  }

  const seen = new Set<string>();
  const refs: OrganizationPublicRef[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) {
      return { ok: false, reason: "malformed" };
    }
    const parsed = OrganizationPublicRefSchema.safeParse(trimmed);
    if (!parsed.success) {
      return { ok: false, reason: "malformed" };
    }
    if (seen.has(parsed.data)) continue;
    seen.add(parsed.data);
    refs.push(parsed.data);
    if (refs.length > MAX_COMPARE_ORGS) {
      return { ok: false, reason: "too_many" };
    }
  }

  return { ok: true, query: { orgRefs: Object.freeze(refs) } };
}

export function compareQueryToSearchParams(query: CompareQuery): URLSearchParams {
  const params = new URLSearchParams();
  for (const ref of query.orgRefs) {
    params.append("org", ref);
  }
  return params;
}

/** Build a shareable compare href from opaque public refs only. */
export function compareHrefFor(refs: readonly string[]): string {
  const normalized: OrganizationPublicRef[] = [];
  const seen = new Set<string>();
  for (const value of refs) {
    const ref = parseOrganizationPublicRef(value);
    if (!ref) continue;
    if (seen.has(ref)) continue;
    seen.add(ref);
    normalized.push(ref);
    if (normalized.length >= MAX_COMPARE_ORGS) break;
  }
  const params = compareQueryToSearchParams({ orgRefs: normalized });
  const qs = params.toString();
  return qs ? `/compare?${qs}` : "/compare";
}

/** Remove one opaque ref from a compare selection (shareable href). */
export function compareHrefWithout(refs: readonly string[], removeRef: string): string {
  return compareHrefFor(refs.filter((item) => item !== removeRef));
}

/** Add one opaque ref when under the cap (shareable href). */
export function compareHrefWith(refs: readonly string[], addRef: string): string {
  return compareHrefFor([...refs, addRef]);
}

export const CompareQuerySchema = z
  .object({
    orgRefs: z.array(OrganizationPublicRefSchema).max(MAX_COMPARE_ORGS),
  })
  .strict();
