import type { EvidenceRecord } from "@/domain/schemas/evidence";
import type { ProvenanceRecord } from "@/domain/schemas/provenance";
import { InvariantViolationError } from "@/domain/errors";

/**
 * Evidence and publication invariants. Fail closed — never invent verified/eligible status.
 */
export function assertEvidenceInvariants(
  evidence: EvidenceRecord,
  provenance: ProvenanceRecord | null,
): void {
  if (evidence.tenantId && provenance && evidence.tenantId !== provenance.tenantId) {
    throw new InvariantViolationError(
      "Evidence and provenance tenants do not match.",
      "tenant mismatch",
    );
  }

  if (evidence.epistemicStatus === "missing") {
    if (evidence.observation !== null) {
      throw new InvariantViolationError(
        "Missing evidence cannot include an observation value.",
        "missing_with_value",
      );
    }
  }

  if (evidence.epistemicStatus === "verified") {
    if (!evidence.provenanceId || !provenance) {
      throw new InvariantViolationError(
        "Verified evidence requires eligible provenance.",
        "verified_without_provenance",
      );
    }
    if (provenance.validationStatus !== "validated") {
      throw new InvariantViolationError(
        "Verified evidence requires validated provenance.",
        "verified_unvalidated_provenance",
      );
    }
    if (provenance.licenseStatus === "unknown") {
      throw new InvariantViolationError(
        "Verified evidence cannot use unknown license provenance.",
        "verified_unknown_license",
      );
    }
  }

  if (evidence.epistemicStatus === "calculated") {
    const hasInputs =
      (evidence.calculatedFromEvidenceIds?.length ?? 0) > 0 ||
      Boolean(evidence.calculationDescriptor);
    if (!hasInputs) {
      throw new InvariantViolationError(
        "Calculated evidence requires input IDs or a calculation descriptor.",
        "calculated_without_inputs",
      );
    }
  }

  if (evidence.epistemicStatus === "rule_based" && !evidence.ruleSetRef) {
    // Rule execution deferred — still require an explicit versioned reference slot.
    throw new InvariantViolationError(
      "Rule-based evidence requires a versioned rule reference.",
      "rule_based_without_ref",
    );
  }

  if (evidence.epistemicStatus === "stale") {
    if (evidence.observation === null) {
      throw new InvariantViolationError(
        "Stale evidence must preserve the original observation.",
        "stale_without_observation",
      );
    }
    if (!evidence.stalenessReason) {
      throw new InvariantViolationError(
        "Stale evidence must explain staleness.",
        "stale_without_reason",
      );
    }
  }

  if (evidence.epistemicStatus === "inference") {
    if (evidence.publicationEligibility === "eligible") {
      throw new InvariantViolationError(
        "Inference evidence is not automatically publication-eligible.",
        "inference_eligible",
      );
    }
  }

  if (provenance?.licenseStatus === "unknown") {
    if (evidence.publicationEligibility === "eligible") {
      throw new InvariantViolationError(
        "Unknown license status is not publication-eligible.",
        "unknown_license_eligible",
      );
    }
  }

  // Confidence and freshness remain independent — no cross-defaulting enforced here.
}

export function assertOrganizationFitUnassessed(fitStatus: string): void {
  if (fitStatus !== "unassessed") {
    throw new InvariantViolationError(
      "Fit must remain unassessed in Phase 3.",
      "fit_not_unassessed",
    );
  }
}
