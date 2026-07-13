import { describe, expect, it } from "vitest";
import { ACTIONS, permissionsForRole, roleHasPermission } from "@/authorization/policy";

describe("authorization policy", () => {
  it("grants analysts read-oriented permissions only", () => {
    const permissions = permissionsForRole("analyst");

    expect(permissions).toEqual([
      "organization:read",
      "evidence:read",
      "methodology:read",
      "assessment:read",
      "brief:read",
    ]);
    expect(roleHasPermission("analyst", "organization:read")).toBe(true);
    expect(roleHasPermission("analyst", "evidence:read")).toBe(true);
    expect(roleHasPermission("analyst", "methodology:read")).toBe(true);
    expect(roleHasPermission("analyst", "assessment:read")).toBe(true);
  });

  it("does not grant mutation actions to analysts", () => {
    expect(roleHasPermission("analyst", "comparison:create")).toBe(false);
    expect(roleHasPermission("analyst", "brief:draft")).toBe(false);
    expect(roleHasPermission("analyst", "brief:approve")).toBe(false);
    expect(roleHasPermission("analyst", "export:request")).toBe(false);
    expect(roleHasPermission("analyst", "vertical:configure")).toBe(false);
  });

  it("grants reviewers approval but not administrative configuration", () => {
    expect(roleHasPermission("reviewer", "brief:approve")).toBe(true);
    expect(roleHasPermission("reviewer", "vertical:configure")).toBe(false);
  });

  it("grants administrators every declared action", () => {
    expect(permissionsForRole("administrator")).toEqual(ACTIONS);
  });

  it("returns no permissions for an unknown role", () => {
    expect(permissionsForRole("unknown_role" as never)).toEqual([]);
  });
});
