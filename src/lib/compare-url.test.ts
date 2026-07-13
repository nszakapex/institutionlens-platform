import { describe, expect, it } from "vitest";
import {
  COMPARE_URL_MAX_ORGS,
  buildCompareHref,
  buildCompareHrefWith,
  buildCompareHrefWithout,
  isOpaqueOrganizationRefFormat,
} from "@/lib/compare-url";

const A = "oref_aaaaaaaaaaaaaaaaaaaa";
const B = "oref_bbbbbbbbbbbbbbbbbbbb";
const C = "oref_cccccccccccccccccccc";
const D = "oref_dddddddddddddddddddd";

describe("compare-url (client-safe)", () => {
  it("accepts only opaque ref format", () => {
    expect(isOpaqueOrganizationRefFormat(A)).toBe(true);
    expect(isOpaqueOrganizationRefFormat("org_syn_fi_001")).toBe(false);
    expect(isOpaqueOrganizationRefFormat("oref_ZZ")).toBe(false);
  });

  it("builds canonical hrefs with dedupe and max cap", () => {
    expect(buildCompareHref([])).toBe("/compare");
    expect(buildCompareHref([A, B])).toBe(`/compare?org=${A}&org=${B}`);
    expect(buildCompareHref([A, A, B])).toBe(`/compare?org=${A}&org=${B}`);
    expect(buildCompareHref([A, B, C, D])).toBe(`/compare?org=${A}&org=${B}&org=${C}`);
    expect(COMPARE_URL_MAX_ORGS).toBe(3);
  });

  it("supports add/remove helpers", () => {
    expect(buildCompareHrefWithout([A, B], A)).toBe(`/compare?org=${B}`);
    expect(buildCompareHrefWith([A], B)).toBe(`/compare?org=${A}&org=${B}`);
  });

  it("treats parameter order as selection order without ranking semantics", () => {
    expect(buildCompareHref([B, A, C])).toBe(`/compare?org=${B}&org=${A}&org=${C}`);
    expect(buildCompareHref([C, B, A, D])).toBe(`/compare?org=${C}&org=${B}&org=${A}`);
    expect(buildCompareHref([A, B, A, B])).toBe(`/compare?org=${A}&org=${B}`);
  });
});
