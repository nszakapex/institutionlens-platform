import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { briefDocumentHref } from "@/application/brief-query";
import { briefPublicRefFor } from "@/domain/brief-public-ref";

export type InboundBriefAction = {
  /** Canonical opaque brief document href (`/briefs/bref_…`). */
  briefHref: string;
  /** Accessible name including organization context (no brief-state leakage). */
  briefActionLabel: string;
};

/**
 * Shared server-side inbound brief action for Overview, Explorer, detail, and Compare.
 * Returns null when brief:read or organization:read is absent — callers omit the action.
 * Does not encode available / insufficient / not_published in the action metadata.
 */
export function inboundBriefActionFor(
  context: AuthorizationContext,
  org: { organizationId: string; displayName: string },
): InboundBriefAction | null {
  if (
    !context.permissions.includes("brief:read") ||
    !context.permissions.includes("organization:read")
  ) {
    return null;
  }
  const briefRef = briefPublicRefFor(context.tenant.id, org.organizationId);
  return {
    briefHref: briefDocumentHref(briefRef),
    briefActionLabel: `Open institutional brief for ${org.displayName}`,
  };
}
