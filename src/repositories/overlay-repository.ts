import type { AuthorizationContext } from "@/authorization/context";
import type { OrganizationId, OverlayId } from "@/domain/ids";
import type { OrganizationOverlay } from "@/domain/overlays/schemas";
import type { OverlayListQueryInput } from "@/domain/schemas/query";
import type { PagedResult } from "@/repositories/organization-repository";

/**
 * Tenant-safe organization overlay repository.
 * Overlays are tenant-private; notes must never appear in public view models.
 */
export interface OverlayRepository {
  getById(context: AuthorizationContext, overlayId: OverlayId): Promise<OrganizationOverlay>;
  getByOrganizationId(
    context: AuthorizationContext,
    organizationId: OrganizationId,
  ): Promise<OrganizationOverlay>;
  list(
    context: AuthorizationContext,
    query: OverlayListQueryInput,
  ): Promise<PagedResult<OrganizationOverlay>>;
}
