/**
 * Offline synthetic assessment generation validation.
 * Run via: tsx --require ./test/shims/preload-server-only.cjs scripts/validate-assessments.ts
 *
 * Requires `@/assessment/engine`, `@/assessment/aggregate`, `@/assessment/opportunity`,
 * and `@/assessment/fingerprint` to be present.
 */
import { generateSyntheticAssessments } from "@/verticals/financial-institutions/assessment/generate";
import { getOverlayForOrg } from "@/verticals/financial-institutions/assessment/synthetic-overlays";
import { SYNTHETIC_FI_PORTFOLIO } from "@/verticals/financial-institutions/assessment/synthetic-portfolio";
import { loadFinancialInstitutionsStore } from "@/repositories/synthetic-organization-repository";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function capabilityPointsFingerprint(
  assessments: readonly {
    capabilityId: string;
    fit: { status: string; pointsAwarded?: number; pointsPossible?: number };
  }[],
): string {
  return JSON.stringify(
    assessments
      .map((item) => ({
        capabilityId: item.capabilityId,
        status: item.fit.status,
        pointsAwarded: "pointsAwarded" in item.fit ? item.fit.pointsAwarded : null,
        pointsPossible: "pointsPossible" in item.fit ? item.fit.pointsPossible : null,
      }))
      .sort((a, b) => a.capabilityId.localeCompare(b.capabilityId)),
  );
}

function main(): void {
  const first = generateSyntheticAssessments();
  const second = generateSyntheticAssessments();
  const store = loadFinancialInstitutionsStore();
  const evidenceById = new Map(store.evidence.map((item) => [item.id, item] as const));
  const provenanceById = new Map(store.provenance.map((item) => [item.id, item] as const));

  assert(first.organizations.length === 24, "Expected assessments for 24 organizations.");
  assert(second.organizations.length === 24, "Second run must also cover 24 organizations.");

  let assessedCapabilityCount = 0;
  let capabilityFitAssessed = 0;
  let portfolioAssessedCount = 0;
  let manifestCount = 0;
  let overlayOrgCount = 0;
  let awardedEntries = 0;
  let awardedWithValidatedLineage = 0;
  const capabilityFitStatuses: Record<string, number> = {};
  const portfolioStatuses: Record<string, number> = {};

  for (let index = 0; index < first.organizations.length; index += 1) {
    const left = first.organizations[index]!;
    const right = second.organizations[index]!;
    assert(left.organizationId === right.organizationId, "Organization order must be stable.");
    assert(
      left.capabilityAssessments.length === SYNTHETIC_FI_PORTFOLIO.capabilities.length,
      `Expected capability assessments for ${left.organizationId}`,
    );

    assessedCapabilityCount += left.capabilityAssessments.length;
    manifestCount += left.manifests.length;
    for (const item of left.capabilityAssessments) {
      capabilityFitStatuses[item.fit.status] = (capabilityFitStatuses[item.fit.status] ?? 0) + 1;
      for (const entry of item.ledger) {
        if (entry.outcome !== "awarded") continue;
        awardedEntries += 1;
        assert(entry.evidenceIds.length > 0, `Awarded ${entry.ruleId} missing evidence IDs`);
        assert(
          entry.provenanceSummaries.some((summary) => summary.validationStatus === "validated"),
          `Awarded ${entry.ruleId} missing validated provenance summary`,
        );
        const hasValidatedSameTenant = entry.evidenceIds.some((evidenceId) => {
          const evidence = evidenceById.get(evidenceId);
          if (!evidence) return false;
          if (evidence.tenantId !== item.tenantId) return false;
          if (evidence.organizationId !== item.organizationId) return false;
          if (!evidence.provenanceId) return false;
          const provenance = provenanceById.get(evidence.provenanceId);
          return !!provenance && provenance.validationStatus === "validated";
        });
        assert(
          hasValidatedSameTenant,
          `Awarded ${entry.ruleId} lacks validated same-tenant evidence lineage`,
        );
        awardedWithValidatedLineage += 1;
      }
    }
    capabilityFitAssessed += left.capabilityAssessments.filter(
      (item) => item.fit.status === "assessed",
    ).length;
    portfolioStatuses[left.portfolioAssessment.status] =
      (portfolioStatuses[left.portfolioAssessment.status] ?? 0) + 1;
    if (left.portfolioAssessment.status === "assessed") {
      portfolioAssessedCount += 1;
      assert(
        left.portfolioAssessment.coverage.conditionalOnAssessedCapabilities === true,
        "Assessed portfolios must mark conditionalOnAssessedCapabilities",
      );
    }

    const overlay = getOverlayForOrg(left.organizationId);
    if (overlay) {
      overlayOrgCount += 1;
      // Overlays affect opportunity context only — capability points are overlay-free.
      assert(
        left.portfolioAssessment.opportunityContexts.length ===
          SYNTHETIC_FI_PORTFOLIO.capabilities.filter((item) => item.status === "enabled").length,
        `Expected opportunity contexts for overlay org ${left.organizationId}`,
      );
    }

    assert(
      capabilityPointsFingerprint(left.capabilityAssessments) ===
        capabilityPointsFingerprint(right.capabilityAssessments),
      `Capability fit drift across runs for ${left.organizationId}`,
    );

    const leftManifests = left.manifests.map((item) => item.outputFingerprint).sort();
    const rightManifests = right.manifests.map((item) => item.outputFingerprint).sort();
    assert(
      JSON.stringify(leftManifests) === JSON.stringify(rightManifests),
      `Fingerprint drift across runs for ${left.organizationId}`,
    );
  }

  const capabilityStatusSum = Object.values(capabilityFitStatuses).reduce(
    (sum, count) => sum + count,
    0,
  );
  const portfolioStatusSum = Object.values(portfolioStatuses).reduce(
    (sum, count) => sum + count,
    0,
  );
  assert(
    capabilityStatusSum === 120,
    `Capability status partition must sum to 120, got ${capabilityStatusSum}`,
  );
  assert(
    portfolioStatusSum === 24,
    `Portfolio status partition must sum to 24, got ${portfolioStatusSum}`,
  );
  assert(
    awardedEntries === awardedWithValidatedLineage,
    `Lineage invariant failed: awarded=${awardedEntries} validated=${awardedWithValidatedLineage}`,
  );

  console.log("Assessment validation passed.");
  console.log(
    JSON.stringify(
      {
        organizations: first.organizations.length,
        overlayOrganizations: overlayOrgCount,
        capabilityAssessments: assessedCapabilityCount,
        capabilityFitAssessed,
        capabilityFitStatuses,
        portfolioAssessed: portfolioAssessedCount,
        portfolioStatuses,
        manifests: manifestCount,
        awardedEntries,
        awardedWithValidatedLineage,
      },
      null,
      2,
    ),
  );
}

try {
  main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Assessment validation failed: ${message}`);
  process.exitCode = 1;
}
