/**
 * Client-safe compare URL helpers.
 * Validates opaque public-ref *format* only — does not authorize or resolve organizations.
 * Server-side parseCompareSearchParams / buildComparePageView remain authoritative.
 *
 * Parameter order is selection order (first-seen after dedupe), not a ranking.
 * Without JavaScript, native GET submits checkboxes in DOM order (candidates are
 * alphabetical labels only); that order has no scoring or preference meaning.
 */

export const COMPARE_URL_MAX_ORGS = 3;
export const COMPARE_URL_MIN_ORGS = 2;

const PUBLIC_REF_PATTERN = /^oref_[a-f0-9]{16,32}$/;

export function isOpaqueOrganizationRefFormat(value: string): boolean {
  return PUBLIC_REF_PATTERN.test(value);
}

/** Build a canonical /compare href from opaque org refs only. */
export function buildCompareHref(refs: readonly string[]): string {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const value of refs) {
    const trimmed = value.trim();
    if (!isOpaqueOrganizationRefFormat(trimmed)) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    unique.push(trimmed);
    if (unique.length >= COMPARE_URL_MAX_ORGS) break;
  }
  if (unique.length === 0) return "/compare";
  const params = new URLSearchParams();
  for (const ref of unique) params.append("org", ref);
  return `/compare?${params.toString()}`;
}

export function buildCompareHrefWithout(refs: readonly string[], removeRef: string): string {
  return buildCompareHref(refs.filter((ref) => ref !== removeRef));
}

export function buildCompareHrefWith(refs: readonly string[], addRef: string): string {
  return buildCompareHref([...refs, addRef]);
}
