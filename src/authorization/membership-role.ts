import "server-only";

import type { Action } from "@/authorization/policy";
import { permissionsForRole } from "@/authorization/policy";
import type { PrincipalRole } from "@/domain/schemas/tenant";

/** Database membership roles (RLS / memberships.role). */
export const MEMBERSHIP_ROLES = ["owner", "analyst", "viewer"] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

/**
 * Maps authoritative DB membership roles onto domain PrincipalRole + permission sets.
 * Viewer is intentionally narrower than analyst (no overlay:read / restricted evidence).
 */
export function mapMembershipRole(role: string): {
  principalRole: PrincipalRole;
  permissions: readonly Action[];
} {
  switch (role) {
    case "owner":
      return {
        principalRole: "administrator",
        permissions: permissionsForRole("administrator"),
      };
    case "analyst":
      return {
        principalRole: "analyst",
        permissions: permissionsForRole("analyst"),
      };
    case "viewer":
      return {
        principalRole: "reviewer",
        permissions: Object.freeze([
          "organization:read",
          "evidence:read",
          "methodology:read",
          "assessment:read",
          "document:read",
          "brief:read",
        ] as const satisfies readonly Action[]),
      };
    default:
      throw new Error("Unsupported membership role.");
  }
}

export function isMembershipRole(value: string): value is MembershipRole {
  return (MEMBERSHIP_ROLES as readonly string[]).includes(value);
}
