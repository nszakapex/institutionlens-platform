import "server-only";

import { evaluateCapabilityAssessment } from "@/assessment/engine";
import { aggregatePortfolioAssessment } from "@/assessment/aggregate";
import { fingerprintEvidence, fingerprintAssessmentOutput } from "@/assessment/fingerprint";
import type { EvaluationContext } from "@/assessment/context";
import {
  CONFIDENCE_POLICY_VERSION,
  COMPLETENESS_POLICY_VERSION,
  ENGINE_VERSION,
  FRESHNESS_POLICY_VERSION,
  PUBLICATION_POLICY_VERSION,
} from "@/domain/assessments/quality";
import { AssessmentManifestSchema, type AssessmentManifest } from "@/domain/assessments/manifest";
import type { CapabilityAssessment, PortfolioAssessment } from "@/domain/assessments/results";
import { DOMAIN_SCHEMA_VERSION } from "@/domain/ids";
import type { EvidenceRecord } from "@/domain/schemas/evidence";
import type { Organization } from "@/domain/schemas/organization";
import type { ProvenanceRecord } from "@/domain/schemas/provenance";
import { financialInstitutionsAdapter } from "@/verticals/financial-institutions/adapter";
import {
  FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
  FINANCIAL_INSTITUTIONS_FIXTURE_VERSION,
  FINANCIAL_INSTITUTIONS_VERTICAL_ID,
} from "@/verticals/financial-institutions/schema";
import {
  buildFinancialInstitutionFieldBag,
  FI_ALLOWLISTED_FIELDS,
} from "@/verticals/financial-institutions/assessment/field-bag";
import {
  ASSESSED_AT,
  CATALOG_VERSION,
  PORTFOLIO_VERSION,
} from "@/verticals/financial-institutions/assessment/methodology";
import { getRuleSet } from "@/verticals/financial-institutions/assessment/rules";
import { SYNTHETIC_FI_PORTFOLIO } from "@/verticals/financial-institutions/assessment/synthetic-portfolio";
import { getOverlayForOrg } from "@/verticals/financial-institutions/assessment/synthetic-overlays";

export type OrganizationAssessmentBundle = {
  organizationId: string;
  capabilityAssessments: readonly CapabilityAssessment[];
  portfolioAssessment: PortfolioAssessment;
  manifests: readonly AssessmentManifest[];
};

export type SyntheticAssessmentBundle = {
  assessedAt: typeof ASSESSED_AT;
  portfolioId: string;
  organizations: readonly OrganizationAssessmentBundle[];
};

function padOrgKey(orgId: string): string {
  const match = /org_syn_fi_(\d{3})$/.exec(orgId);
  return match?.[1] ?? "000";
}

function capabilityShort(capabilityId: string): string {
  return capabilityId
    .replace(/^cap_syn_fi_/, "")
    .replace(/_/g, "")
    .slice(0, 12);
}

function assessmentIdFor(orgId: string, capabilityId: string): string {
  const key = padOrgKey(orgId);
  const short = capabilityShort(capabilityId);
  return `assess_syn_fi_${key}_${short}`;
}

function portfolioAssessmentIdFor(orgId: string): string {
  return `assess_syn_fi_${padOrgKey(orgId)}_portfolio`;
}

function buildContext(
  org: Organization,
  evidence: readonly EvidenceRecord[],
  provenanceById: ReadonlyMap<string, ProvenanceRecord>,
): EvaluationContext {
  const orgEvidence = evidence
    .filter((item) => item.organizationId === org.id)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));

  const fieldBag = buildFinancialInstitutionFieldBag(org, orgEvidence);

  return {
    organizationId: org.id,
    tenantId: org.tenantId,
    assessedAt: ASSESSED_AT,
    evidence: orgEvidence,
    provenanceById,
    fields: fieldBag.fields,
    fieldSources: fieldBag.fieldSources,
    allowlistedFields: FI_ALLOWLISTED_FIELDS,
  };
}

function buildManifest(input: {
  assessment: CapabilityAssessment;
  evidenceIds: readonly string[];
  overlayId?: string;
  overlayVersion?: string;
}): AssessmentManifest {
  const evidenceFingerprint = fingerprintEvidence([...input.evidenceIds]);
  const outputFingerprint = fingerprintAssessmentOutput({
    fit: input.assessment.fit,
    confidence: input.assessment.confidence,
    freshness: input.assessment.freshness,
    completeness: input.assessment.completeness,
    publicationEligibility: input.assessment.publicationEligibility,
    ledger: input.assessment.ledger,
  });

  return AssessmentManifestSchema.parse({
    assessmentId: input.assessment.id,
    tenantContextRef: "demo_research",
    domainSchemaVersion: DOMAIN_SCHEMA_VERSION,
    engineVersion: ENGINE_VERSION,
    verticalId: FINANCIAL_INSTITUTIONS_VERTICAL_ID,
    adapterVersion: FINANCIAL_INSTITUTIONS_ADAPTER_VERSION,
    datasetFixtureVersion: FINANCIAL_INSTITUTIONS_FIXTURE_VERSION,
    capabilityCatalogVersion: CATALOG_VERSION,
    portfolioId: SYNTHETIC_FI_PORTFOLIO.id,
    portfolioVersion: PORTFOLIO_VERSION,
    ruleSetVersions: [
      {
        ruleSetId: input.assessment.ruleSetId,
        version: input.assessment.ruleSetVersion,
      },
    ],
    confidencePolicyVersion: CONFIDENCE_POLICY_VERSION,
    freshnessPolicyVersion: FRESHNESS_POLICY_VERSION,
    completenessPolicyVersion: COMPLETENESS_POLICY_VERSION,
    publicationPolicyVersion: PUBLICATION_POLICY_VERSION,
    assessedAt: ASSESSED_AT,
    organizationId: input.assessment.organizationId,
    evidenceIds: [...input.evidenceIds].sort((a, b) => a.localeCompare(b)),
    evidenceFingerprint,
    ...(input.overlayId
      ? {
          overlayId: input.overlayId,
          overlayVersion: input.overlayVersion ?? "1.0.0",
        }
      : {}),
    outputFingerprint,
    synthetic: true,
  });
}

/**
 * Generate immutable capability + portfolio assessments for all 24 synthetic FI orgs.
 * Depends on the generic assessment engine modules under `@/assessment/*`.
 */
export function generateSyntheticAssessments(): SyntheticAssessmentBundle {
  const fixtures = financialInstitutionsAdapter.loadSyntheticFixtures();
  const provenanceById = new Map(fixtures.provenance.map((item) => [item.id, item] as const));
  const enabledCapabilities = SYNTHETIC_FI_PORTFOLIO.capabilities.filter(
    (capability) => capability.status === "enabled",
  );

  const organizations: OrganizationAssessmentBundle[] = [];

  for (const org of fixtures.organizations) {
    const context = buildContext(org, fixtures.evidence, provenanceById);
    const overlay = getOverlayForOrg(org.id) ?? null;
    const capabilityAssessments: CapabilityAssessment[] = [];
    const manifests: AssessmentManifest[] = [];

    for (const capabilityRef of enabledCapabilities) {
      const ruleSet = getRuleSet(capabilityRef.capabilityId, capabilityRef.ruleSetVersion);
      const assessment = evaluateCapabilityAssessment({
        assessmentId: assessmentIdFor(org.id, capabilityRef.capabilityId),
        tenantId: SYNTHETIC_FI_PORTFOLIO.tenantId,
        organizationId: org.id,
        portfolioId: SYNTHETIC_FI_PORTFOLIO.id,
        ruleSet,
        context,
      });
      capabilityAssessments.push(assessment);
      manifests.push(
        buildManifest({
          assessment,
          evidenceIds: context.evidence.map((item) => item.id),
          ...(overlay ? { overlayId: overlay.id, overlayVersion: overlay.schemaVersion } : {}),
        }),
      );
    }

    // Opportunity contexts are derived inside aggregate from the overlay.
    // Overlays never alter capability fit points.
    const portfolioAssessment = aggregatePortfolioAssessment({
      assessmentId: portfolioAssessmentIdFor(org.id),
      tenantId: SYNTHETIC_FI_PORTFOLIO.tenantId,
      organizationId: org.id,
      portfolio: SYNTHETIC_FI_PORTFOLIO,
      capabilityAssessments,
      overlay,
      assessedAt: ASSESSED_AT,
    });

    organizations.push(
      Object.freeze({
        organizationId: org.id,
        capabilityAssessments: Object.freeze(capabilityAssessments),
        portfolioAssessment,
        manifests: Object.freeze(manifests),
      }),
    );
  }

  return Object.freeze({
    assessedAt: ASSESSED_AT,
    portfolioId: SYNTHETIC_FI_PORTFOLIO.id,
    organizations: Object.freeze(organizations),
  });
}
