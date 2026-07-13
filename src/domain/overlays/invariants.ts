import { InvariantViolationError } from "@/domain/errors";
import type { OrganizationOverlay } from "@/domain/overlays/schemas";
import type { OrganizationId, TenantId } from "@/domain/ids";

const EMAIL_LIKE = /@/;
/** Sequences that look like North-American-style phone numbers. */
const PHONE_LIKE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b|\b\d{7,15}\b/;

/**
 * Overlay tenant and organization must match the authorized assessment context.
 * Public messages stay free of IDs.
 */
export function assertOverlayTenantOrgConsistency(
  overlay: OrganizationOverlay,
  expectedTenantId: TenantId,
  expectedOrganizationId: OrganizationId,
): void {
  if (overlay.tenantId !== expectedTenantId || overlay.organizationId !== expectedOrganizationId) {
    throw new InvariantViolationError(
      "Overlay does not match the assessment context.",
      "overlay_tenant_org_mismatch",
    );
  }
}

/**
 * Reject obvious PII patterns in private overlay notes.
 * Notes never enter public view models regardless.
 */
export function assertNoPiiPatterns(overlay: OrganizationOverlay): void {
  const notes = overlay.notes;
  if (!notes) {
    return;
  }

  if (EMAIL_LIKE.test(notes)) {
    throw new InvariantViolationError(
      "Overlay notes must not contain contact identifiers.",
      "overlay_notes_email_like",
    );
  }

  if (PHONE_LIKE.test(notes)) {
    throw new InvariantViolationError(
      "Overlay notes must not contain contact identifiers.",
      "overlay_notes_phone_like",
    );
  }
}
