import { describe, expect, it } from "vitest";
import { isMembershipRole, mapMembershipRole } from "@/authorization/membership-role";

describe("mapMembershipRole", () => {
  it("maps owner to administrator permissions", () => {
    const mapped = mapMembershipRole("owner");
    expect(mapped.principalRole).toBe("administrator");
    expect(mapped.permissions).toContain("overlay:read");
  });

  it("maps analyst to analyst permissions", () => {
    const mapped = mapMembershipRole("analyst");
    expect(mapped.principalRole).toBe("analyst");
    expect(mapped.permissions).toContain("assessment:read");
  });

  it("maps viewer to a narrower reviewer-like set without overlay read", () => {
    const mapped = mapMembershipRole("viewer");
    expect(mapped.principalRole).toBe("reviewer");
    expect(mapped.permissions).toContain("organization:read");
    expect(mapped.permissions).toContain("document:read");
    expect(mapped.permissions).not.toContain("document:upload");
    expect(mapped.permissions).not.toContain("overlay:read");
    expect(mapped.permissions).not.toContain("evidence:restricted_read");
  });

  it("rejects unknown roles", () => {
    expect(isMembershipRole("admin")).toBe(false);
    expect(() => mapMembershipRole("admin")).toThrow(/Unsupported membership role/);
  });
});
