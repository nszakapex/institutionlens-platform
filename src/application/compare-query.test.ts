import { describe, expect, it } from "vitest";
import {
  MAX_COMPARE_ORGS,
  compareHrefFor,
  compareHrefWith,
  compareHrefWithout,
  compareQueryToSearchParams,
  parseCompareSearchParams,
} from "@/application/compare-query";
import { organizationPublicRefFor } from "@/domain/organization-public-ref";

const REF_A = organizationPublicRefFor("org_syn_fi_001");
const REF_B = organizationPublicRefFor("org_syn_fi_002");
const REF_C = organizationPublicRefFor("org_syn_fi_003");
const REF_D = organizationPublicRefFor("org_syn_fi_004");

describe("compare query", () => {
  it("parses empty selection", () => {
    const parsed = parseCompareSearchParams({});
    expect(parsed).toEqual({ ok: true, query: { orgRefs: [] } });
  });

  it("preserves order and drops duplicates", () => {
    const parsed = parseCompareSearchParams({
      org: [REF_B, REF_A, REF_B, REF_C],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.query.orgRefs).toEqual([REF_B, REF_A, REF_C]);
  });

  it("rejects malformed tokens fail-closed", () => {
    expect(parseCompareSearchParams({ org: "org_syn_fi_001" }).ok).toBe(false);
    expect(parseCompareSearchParams({ org: ["", REF_A] }).ok).toBe(false);
    expect(parseCompareSearchParams({ org: "oref_ZZZZ" }).ok).toBe(false);
  });

  it("rejects more than three distinct refs", () => {
    const parsed = parseCompareSearchParams({
      org: [REF_A, REF_B, REF_C, REF_D],
    });
    expect(parsed).toEqual({ ok: false, reason: "too_many" });
    expect(MAX_COMPARE_ORGS).toBe(3);
  });

  it("round-trips through search params and href helpers", () => {
    const params = compareQueryToSearchParams({ orgRefs: [REF_A, REF_B] });
    expect(params.getAll("org")).toEqual([REF_A, REF_B]);
    expect(compareHrefFor([REF_A, REF_B])).toBe(`/compare?org=${REF_A}&org=${REF_B}`);
    expect(compareHrefWithout([REF_A, REF_B], REF_A)).toBe(`/compare?org=${REF_B}`);
    expect(compareHrefWith([REF_A], REF_B)).toBe(`/compare?org=${REF_A}&org=${REF_B}`);
    expect(compareHrefWith([REF_A, REF_B, REF_C], REF_D)).toBe(
      `/compare?org=${REF_A}&org=${REF_B}&org=${REF_C}`,
    );
  });
});
