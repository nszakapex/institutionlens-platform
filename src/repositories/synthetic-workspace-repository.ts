import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { AuthorizationError } from "@/domain/errors";
import type {
  WorkspaceContextRecord,
  WorkspaceRepository,
} from "@/repositories/repository-contracts";

export class SyntheticWorkspaceRepository implements WorkspaceRepository {
  async getCurrent(context: AuthorizationContext): Promise<WorkspaceContextRecord> {
    if (
      context.tenant.status !== "active" ||
      context.principal.status !== "active" ||
      context.principal.tenantId !== context.tenant.id
    ) {
      throw new AuthorizationError("Not authorized for this action.");
    }

    return Object.freeze({
      tenantId: context.tenant.id,
      principalId: context.principal.id,
      displayName: context.tenant.displayName,
      status: context.tenant.status,
      role: context.principal.role,
      allowedVerticalIds: Object.freeze([...context.tenant.allowedVerticalIds]),
      permissions: Object.freeze([...context.permissions]),
    });
  }
}
