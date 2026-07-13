import type { CapabilityId } from "@/domain/ids";
import type { OpportunityContext } from "@/domain/assessments/results";
import type { OrganizationOverlay } from "@/domain/overlays/schemas";
import type { CapabilityUsageStatus } from "@/domain/overlays/schemas";

function usageForCapability(
  overlay: OrganizationOverlay,
  capabilityId: CapabilityId,
): CapabilityUsageStatus {
  const match = overlay.capabilityUsage.find((entry) => entry.capabilityId === capabilityId);
  return match?.usageStatus ?? "unknown";
}

/**
 * Derive internal-only opportunity context from a tenant overlay.
 * Overlays never alter fit points — this dimension is separate.
 */
export function deriveOpportunityContext(
  overlay: OrganizationOverlay | null,
  capabilityId: CapabilityId,
): OpportunityContext {
  if (!overlay) {
    return {
      status: "unknown",
      reasonCode: "no_overlay",
      capabilityId,
    };
  }

  if (overlay.relationshipStatus === "excluded") {
    return {
      status: "excluded",
      reasonCode: "explicit_exclusion",
      capabilityId,
    };
  }

  const usageStatus = usageForCapability(overlay, capabilityId);

  if (overlay.relationshipStatus === "prospect") {
    return {
      status: "new_logo",
      reasonCode: "prospect_relationship",
      capabilityId,
    };
  }

  if (overlay.relationshipStatus === "active_client" && usageStatus === "not_used") {
    return {
      status: "cross_sell",
      reasonCode: "active_client_not_used",
      capabilityId,
    };
  }

  if (overlay.relationshipStatus === "active_client" && usageStatus === "active") {
    return {
      status: "existing_use",
      reasonCode: "active_client_active_usage",
      capabilityId,
    };
  }

  if (overlay.relationshipStatus === "former_client" || usageStatus === "former") {
    return {
      status: "renewal_or_reengagement",
      reasonCode: "former_relationship_or_usage",
      capabilityId,
    };
  }

  return {
    status: "unknown",
    reasonCode: "insufficient_overlay_signal",
    capabilityId,
  };
}
