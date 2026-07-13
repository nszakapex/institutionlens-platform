/**
 * Explicit action vocabulary — Phase 6 adds overlay:read and evidence:restricted_read.
 * Mutations remain future-facing.
 */
export const ACTIONS = [
  "organization:read",
  "evidence:read",
  "evidence:restricted_read",
  "methodology:read",
  "assessment:read",
  "overlay:read",
  "comparison:create",
  "brief:read",
  "brief:draft",
  "brief:approve",
  "export:request",
  "vertical:configure",
] as const;

export type Action = (typeof ACTIONS)[number];

export const READ_ACTIONS = [
  "organization:read",
  "evidence:read",
  "methodology:read",
  "assessment:read",
  "overlay:read",
] as const;

/** Mutation actions are defined for future use but unused in Phase 4 schema foundations. */
export const MUTATION_ACTIONS = [
  "comparison:create",
  "brief:draft",
  "brief:approve",
  "export:request",
  "vertical:configure",
] as const;

import type { PrincipalRole } from "@/domain/schemas/tenant";

const ROLE_PERMISSIONS: Record<PrincipalRole, readonly Action[]> = {
  analyst: [
    "organization:read",
    "evidence:read",
    "methodology:read",
    "assessment:read",
    "overlay:read",
    "brief:read",
  ],
  reviewer: [
    "organization:read",
    "evidence:read",
    "methodology:read",
    "assessment:read",
    "overlay:read",
    "brief:read",
    "brief:approve",
  ],
  administrator: [...ACTIONS],
};

export function permissionsForRole(role: PrincipalRole): readonly Action[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermission(role: PrincipalRole, action: Action): boolean {
  return permissionsForRole(role).includes(action);
}
