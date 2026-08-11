/**
 * Explicit action vocabulary — Phase 6 adds overlay:read and evidence:restricted_read.
 * Document vault actions support tenant-provided research files for founding clients.
 */
export const ACTIONS = [
  "organization:read",
  "evidence:read",
  "evidence:restricted_read",
  "methodology:read",
  "assessment:read",
  "overlay:read",
  "document:read",
  "document:upload",
  "document:link",
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
  "document:read",
] as const;

/** Mutation actions — document upload/link are active in local-demo vault. */
export const MUTATION_ACTIONS = [
  "document:upload",
  "document:link",
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
    "document:read",
    "document:upload",
    "document:link",
    "brief:read",
  ],
  reviewer: [
    "organization:read",
    "evidence:read",
    "methodology:read",
    "assessment:read",
    "overlay:read",
    "document:read",
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
