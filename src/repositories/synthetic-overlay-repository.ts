import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { assertPermission } from "@/authorization/context";
import { NotFoundError, ValidationError } from "@/domain/errors";
import type { OrganizationId, OverlayId } from "@/domain/ids";
import { OrganizationIdSchema, OverlayIdSchema } from "@/domain/ids";
import type { OrganizationOverlay } from "@/domain/overlays/schemas";
import {
  MAX_PAGE_SIZE,
  OverlayListQuerySchema,
  type OverlayListQueryInput,
} from "@/domain/schemas/query";
import type { PagedResult } from "@/repositories/organization-repository";
import type { OverlayRepository } from "@/repositories/overlay-repository";
import { SYNTHETIC_FI_OVERLAYS } from "@/verticals/financial-institutions/assessment/synthetic-overlays";

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    if (child && typeof child === "object" && !Object.isFrozen(child)) {
      deepFreeze(child);
    }
  }
  return value;
}

function cloneFrozen<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function paginate<T>(items: readonly T[], page: number, pageSize: number): PagedResult<T> {
  const start = (page - 1) * pageSize;
  return {
    items: Object.freeze(items.slice(start, start + pageSize).map((item) => cloneFrozen(item))),
    page,
    pageSize,
    total: items.length,
  };
}

const OVERLAYS: readonly OrganizationOverlay[] = Object.freeze(
  SYNTHETIC_FI_OVERLAYS.map((item) => deepFreeze(structuredClone(item))),
);

export class SyntheticOverlayRepository implements OverlayRepository {
  private scoped(context: AuthorizationContext): OrganizationOverlay[] {
    return OVERLAYS.filter((item) => item.tenantId === context.tenant.id);
  }

  async getById(context: AuthorizationContext, overlayId: OverlayId): Promise<OrganizationOverlay> {
    assertPermission(context, "overlay:read");
    let id: OverlayId;
    try {
      id = OverlayIdSchema.parse(overlayId);
    } catch {
      throw new ValidationError("Invalid overlay id.");
    }

    const found = OVERLAYS.find((item) => item.id === id);
    if (!found || found.tenantId !== context.tenant.id) {
      throw new NotFoundError("Resource not found.");
    }
    return cloneFrozen(found);
  }

  async getByOrganizationId(
    context: AuthorizationContext,
    organizationId: OrganizationId,
  ): Promise<OrganizationOverlay> {
    assertPermission(context, "overlay:read");
    let orgId: OrganizationId;
    try {
      orgId = OrganizationIdSchema.parse(organizationId);
    } catch {
      throw new ValidationError("Invalid organization id.");
    }

    const found = this.scoped(context).find((item) => item.organizationId === orgId);
    if (!found) {
      throw new NotFoundError("Resource not found.");
    }
    return cloneFrozen(found);
  }

  async list(
    context: AuthorizationContext,
    rawQuery: OverlayListQueryInput,
  ): Promise<PagedResult<OrganizationOverlay>> {
    assertPermission(context, "overlay:read");
    const query = OverlayListQuerySchema.parse(rawQuery);
    if (query.pageSize > MAX_PAGE_SIZE) {
      throw new ValidationError(`pageSize must be <= ${MAX_PAGE_SIZE}.`);
    }

    let items = this.scoped(context);
    if (query.organizationId) {
      let orgId: OrganizationId;
      try {
        orgId = OrganizationIdSchema.parse(query.organizationId);
      } catch {
        throw new ValidationError("Invalid organization id.");
      }
      items = items.filter((item) => item.organizationId === orgId);
    }

    items = items.slice().sort((a, b) => compareIds(a.id, b.id));
    return paginate(items, query.page, query.pageSize);
  }
}
