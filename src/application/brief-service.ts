import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { assertPermission } from "@/authorization/context";
import { roleHasPermission, type Action } from "@/authorization/policy";
import {
  briefDirectoryHref,
  briefDocumentHref,
  parseBriefDirectorySearchParams,
  parseBriefRouteParam,
} from "@/application/brief-query";
import { BRIEF_SECTION_TITLES, BRIEF_TEMPLATES } from "@/application/brief-templates";
import type {
  BriefCapabilitySummaryView,
  BriefDirectoryCandidateView,
  BriefDirectoryPageView,
  BriefDocumentPageView,
  BriefEvidenceCoverageView,
  BriefManifestView,
  BriefObservationView,
  BriefOverlayView,
  BriefPageState,
  BriefProvenanceSummaryView,
  BriefSectionKey,
  BriefSectionView,
} from "@/application/brief-view-models";
import { BRIEF_SECTION_ORDER } from "@/application/brief-view-models";
import { fitStatusLabelFor, observedFitBandLabelFor } from "@/application/assessment-view-models";
import {
  capabilityNameById,
  getTenantResearchReadModel,
  insufficientReasonCodes,
  reasonSummaryFromCodes,
  type OrgResearchRecord,
} from "@/application/research-read-model";
import { AuthorizationError } from "@/domain/errors";
import { briefPublicRefFor } from "@/domain/brief-public-ref";
import type { OrganizationPublicRef } from "@/domain/organization-public-ref";
import type { EvidenceRecord } from "@/domain/schemas/evidence";
import type { ProvenanceRecord } from "@/domain/schemas/provenance";
import { loadFinancialInstitutionsStore } from "@/repositories/synthetic-organization-repository";
import { FINANCIAL_INSTITUTIONS_FIXTURE_VERSION } from "@/verticals/financial-institutions/schema";
import {
  ASSESSED_AT,
  METHODOLOGY_VERSION,
} from "@/verticals/financial-institutions/assessment/methodology";
import { SYNTHETIC_FI_PORTFOLIO } from "@/verticals/financial-institutions/assessment/synthetic-portfolio";
import { FINANCIAL_INSTITUTIONS_VOCABULARY } from "@/verticals/financial-institutions/vocabulary";

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  Object.freeze(value);
  for (const child of Object.values(value)) {
    if (child && typeof child === "object" && !Object.isFrozen(child)) {
      deepFreeze(child);
    }
  }
  return value;
}

function hasPermission(context: AuthorizationContext, action: Action): boolean {
  return context.permissions.includes(action) && roleHasPermission(context.principal.role, action);
}

function label(value: string): string {
  const vocab = FINANCIAL_INSTITUTIONS_VOCABULARY as Record<string, string>;
  return vocab[value] ?? value.replace(/_/g, " ");
}

function statusLabel(status: string): string {
  if (status === "insufficient_evidence") return "Insufficient evidence";
  if (status === "assessed") return "Assessed";
  return label(status);
}

function manifest(): BriefManifestView {
  return {
    methodologyVersion: METHODOLOGY_VERSION,
    datasetVersion: FINANCIAL_INSTITUTIONS_FIXTURE_VERSION,
    asAssessedAt: ASSESSED_AT,
    syntheticNotice:
      "Synthetic institutional brief only. Content is generated from the local demo research dataset.",
    permittedUse: BRIEF_TEMPLATES.permittedUse,
    nonRecommendationDisclaimer: BRIEF_TEMPLATES.disclaimer,
  };
}

const FORBIDDEN =
  /org_syn_fi_|ev_syn_|prov_syn_|cap_syn_|overlay_syn_|tenant_demo|principal_demo|demo-tenant-local|demo-principal-local|Synthetic prospect flagged|private note/i;

const RANKING_LANGUAGE =
  /\b(?:winner|top pick|recommended organization|best investment|guaranteed returns)\b/i;

function assertNoLeakage(payload: unknown): void {
  const serialized = JSON.stringify(payload);
  if (FORBIDDEN.test(serialized)) {
    throw new Error("Brief view model failed privacy redaction checks.");
  }
  if (/"organizationId"|"capabilityId"|"evidenceId"|"provenanceId"|"notes"/.test(serialized)) {
    throw new Error("Brief view model exposed raw internal identifiers or private notes.");
  }
  if (RANKING_LANGUAGE.test(serialized)) {
    throw new Error("Brief view model included ranking or recommendation language.");
  }
}

function requireBriefReadAccess(context: AuthorizationContext): void {
  assertPermission(context, "brief:read");
  assertPermission(context, "organization:read");
  assertPermission(context, "assessment:read");
}

function finalizeBriefView<T>(context: AuthorizationContext, view: T): T {
  requireBriefReadAccess(context);
  const frozen = deepFreeze(view);
  assertNoLeakage(frozen);
  return frozen;
}

function observation(
  key: string,
  language: string,
  classification: BriefObservationView["classification"],
  evidenceTitles: readonly string[] = [],
  provenanceLabels: readonly string[] = [],
): BriefObservationView {
  return {
    key,
    language,
    classification,
    supportingEvidenceTitles: Object.freeze([...evidenceTitles]),
    supportingProvenanceLabels: Object.freeze([...provenanceLabels]),
  };
}

function section(
  key: BriefSectionKey,
  summary: string,
  observations: readonly BriefObservationView[],
): BriefSectionView {
  return {
    key,
    title: BRIEF_SECTION_TITLES[key],
    summary,
    observations: Object.freeze([...observations]),
  };
}

function publicationAllowsNumericFit(eligibility: string): boolean {
  return eligibility === "eligible" || eligibility === "internal_only";
}

function resolveDocumentState(org: OrgResearchRecord): {
  state: Extract<BriefPageState, "available" | "insufficient_evidence" | "not_published">;
  stateMessage: string;
} {
  if (org.portfolio.status === "insufficient_evidence") {
    return { state: "insufficient_evidence", stateMessage: BRIEF_TEMPLATES.insufficientState };
  }
  if (!publicationAllowsNumericFit(org.portfolio.publicationEligibility)) {
    return { state: "not_published", stateMessage: BRIEF_TEMPLATES.notPublishedState };
  }
  return {
    state: "available",
    stateMessage: "Synthetic institutional brief projected from existing authorized read models.",
  };
}

function capabilityPriority(capabilityId: string): number {
  return (
    SYNTHETIC_FI_PORTFOLIO.capabilities.find((item) => item.capabilityId === capabilityId)
      ?.priority ?? 0
  );
}

function orderedAssessments(org: OrgResearchRecord) {
  return [...org.capabilityAssessments].sort((a, b) => {
    const priorityDelta = capabilityPriority(b.capabilityId) - capabilityPriority(a.capabilityId);
    return priorityDelta || a.capabilityId.localeCompare(b.capabilityId);
  });
}

function emptyDocumentShell(
  overrides: Partial<BriefDocumentPageView> &
    Pick<BriefDocumentPageView, "state" | "stateMessage" | "title" | "directoryHref">,
): BriefDocumentPageView {
  return {
    briefPublicRef: null,
    organizationPublicRef: null,
    displayName: null,
    detailHref: null,
    asOfLabel: null,
    freshnessStatement: null,
    purposeStatement: BRIEF_TEMPLATES.purpose,
    sections: Object.freeze([]),
    capabilities: Object.freeze([]),
    evidenceCoverage: null,
    provenanceSummaries: Object.freeze([]),
    overlay: null,
    manifest: manifest(),
    ...overrides,
  };
}

function visibleEvidence(
  context: AuthorizationContext,
  org: OrgResearchRecord,
  evidence: readonly EvidenceRecord[],
  provenanceById: ReadonlyMap<string, ProvenanceRecord>,
): readonly EvidenceRecord[] {
  if (!hasPermission(context, "evidence:read")) {
    return Object.freeze([]);
  }
  const canReadRestricted = hasPermission(context, "evidence:restricted_read");
  const permitted = evidence.filter((item) => {
    if (item.organizationId !== org.organizationId) return false;
    if (item.tenantId !== context.tenant.id) return false;
    const provenance = item.provenanceId ? provenanceById.get(item.provenanceId) : undefined;
    const restricted =
      item.publicationEligibility === "restricted" ||
      provenance?.accessClassification === "restricted";
    if (restricted && !canReadRestricted) return false;
    return true;
  });
  return Object.freeze([...permitted].sort((a, b) => a.title.localeCompare(b.title, "en")));
}

function buildOverlayProjection(
  context: AuthorizationContext,
  org: OrgResearchRecord,
): BriefOverlayView {
  if (!hasPermission(context, "overlay:read")) {
    return { access: "restricted" };
  }
  if (!org.overlay) {
    return { access: "omitted", message: BRIEF_TEMPLATES.overlayOmitted };
  }
  return {
    access: "available",
    relationshipStatusLabel: label(org.overlay.relationshipStatus),
    matchStatusLabel: label(org.overlay.matchStatus),
    reviewStatusLabel: label(org.overlay.reviewStatus),
    sourceClassificationLabel: label(org.overlay.sourceClassification),
    capabilityUsageLabels: Object.freeze(
      org.overlay.capabilityUsage.map(
        (item) => `${capabilityNameById(item.capabilityId)}: ${label(item.usageStatus)}`,
      ),
    ),
  };
}

function buildCapabilities(
  org: OrgResearchRecord,
  state: BriefPageState,
): readonly BriefCapabilitySummaryView[] {
  const suppressNumeric =
    state === "not_published" ||
    state === "insufficient_evidence" ||
    !publicationAllowsNumericFit(org.portfolio.publicationEligibility);

  return Object.freeze(
    orderedAssessments(org).map((assessment): BriefCapabilitySummaryView => {
      const name = capabilityNameById(assessment.capabilityId);
      const fit = assessment.fit;
      const allowCapabilityNumeric =
        !suppressNumeric &&
        fit.status === "assessed" &&
        publicationAllowsNumericFit(assessment.publicationEligibility);

      if (
        state === "not_published" &&
        !publicationAllowsNumericFit(assessment.publicationEligibility)
      ) {
        return {
          capabilityName: name,
          statusLabel: "Not published",
          confidence: null,
          freshness: null,
          completeness: null,
          fitBandLabel: null,
          pointsAwarded: null,
          pointsPossible: null,
          publicationEligibility: "unavailable",
          publicationNote: BRIEF_TEMPLATES.notPublishedObservation,
        };
      }

      if (allowCapabilityNumeric && fit.status === "assessed") {
        return {
          capabilityName: name,
          statusLabel: fitStatusLabelFor(fit.status),
          confidence: assessment.confidence,
          freshness: assessment.freshness,
          completeness: assessment.completeness,
          fitBandLabel: observedFitBandLabelFor(fit.band),
          pointsAwarded: fit.pointsAwarded,
          pointsPossible: fit.pointsPossible,
          publicationEligibility: assessment.publicationEligibility,
          publicationNote: "Projected from the existing Phase 4 capability assessment.",
        };
      }

      return {
        capabilityName: name,
        statusLabel: fitStatusLabelFor(fit.status),
        confidence: assessment.confidence,
        freshness: assessment.freshness,
        completeness: assessment.completeness,
        fitBandLabel: null,
        pointsAwarded: null,
        pointsPossible: null,
        publicationEligibility: assessment.publicationEligibility,
        publicationNote: BRIEF_TEMPLATES.capabilityFitUnavailable(name),
      };
    }),
  );
}

function buildEvidenceCoverage(
  permittedCount: number,
  canReadEvidence: boolean,
): BriefEvidenceCoverageView {
  if (!canReadEvidence) {
    return {
      permittedCount: 0,
      message: "Evidence is restricted for this workspace role.",
    };
  }
  return {
    permittedCount,
    message:
      permittedCount === 0
        ? BRIEF_TEMPLATES.evidenceNone
        : BRIEF_TEMPLATES.evidenceCoverage(permittedCount),
  };
}

function buildProvenanceSummaries(
  permitted: readonly EvidenceRecord[],
  provenanceById: ReadonlyMap<string, ProvenanceRecord>,
): readonly BriefProvenanceSummaryView[] {
  const seen = new Set<string>();
  const rows: BriefProvenanceSummaryView[] = [];
  for (const item of permitted) {
    if (!item.provenanceId) continue;
    if (seen.has(item.provenanceId)) continue;
    const provenance = provenanceById.get(item.provenanceId);
    if (!provenance) continue;
    if (provenance.accessClassification === "restricted") continue;
    seen.add(item.provenanceId);
    rows.push({
      label: provenance.sourceName,
      licenseStatusLabel: label(provenance.licenseStatus),
      accessClassificationLabel: label(provenance.accessClassification),
    });
  }
  return Object.freeze(rows.sort((a, b) => a.label.localeCompare(b.label, "en")));
}

function buildSections(input: {
  org: OrgResearchRecord;
  state: Extract<BriefPageState, "available" | "insufficient_evidence" | "not_published">;
  capabilities: readonly BriefCapabilitySummaryView[];
  evidenceCoverage: BriefEvidenceCoverageView;
  provenanceSummaries: readonly BriefProvenanceSummaryView[];
  permittedEvidence: readonly EvidenceRecord[];
  provenanceById: ReadonlyMap<string, ProvenanceRecord>;
  overlay: BriefOverlayView;
}): readonly BriefSectionView[] {
  const {
    org,
    state,
    capabilities,
    evidenceCoverage,
    provenanceSummaries,
    permittedEvidence,
    provenanceById,
    overlay,
  } = input;
  const meta = manifest();
  const suppressDetails = state === "not_published";
  const suppressNumeric =
    state === "not_published" ||
    state === "insufficient_evidence" ||
    !publicationAllowsNumericFit(org.portfolio.publicationEligibility);

  const identity = section("identity", "Brief identity and dataset-derived as-of metadata.", [
    observation(
      "brief.identity.as_of",
      BRIEF_TEMPLATES.identityAsOf(meta.asAssessedAt),
      "assessment",
    ),
    observation(
      "brief.identity.freshness",
      BRIEF_TEMPLATES.identityFreshness(label(org.portfolio.freshness)),
      "assessment",
    ),
  ]);

  const purpose = section("purpose", BRIEF_TEMPLATES.purpose, [
    observation("brief.purpose.statement", BRIEF_TEMPLATES.purpose, "limitation"),
    observation("brief.purpose.permitted_use", BRIEF_TEMPLATES.permittedUse, "limitation"),
  ]);

  const profile = section("profile", org.summary, [
    observation(
      "brief.profile.type",
      BRIEF_TEMPLATES.profileType(label(org.organizationType)),
      "limitation",
    ),
    observation(
      "brief.profile.lifecycle",
      BRIEF_TEMPLATES.profileLifecycle(label(org.lifecycleStatus)),
      "limitation",
    ),
    observation(
      "brief.profile.location",
      BRIEF_TEMPLATES.profileLocation(org.locationLabel),
      "limitation",
    ),
    observation("brief.profile.source", BRIEF_TEMPLATES.profileSourceNote, "limitation"),
  ]);

  const portfolioObservations: BriefObservationView[] = [
    observation(
      "brief.portfolio.status",
      BRIEF_TEMPLATES.portfolioStatus(statusLabel(org.portfolio.status)),
      "assessment",
    ),
    observation(
      "brief.portfolio.coverage",
      BRIEF_TEMPLATES.portfolioCoverage(
        org.portfolio.coverage.assessedCapabilityCount,
        org.portfolio.coverage.enabledCapabilityCount,
      ),
      "assessment",
    ),
  ];
  if (
    !suppressNumeric &&
    org.portfolio.portfolioPriorityScore &&
    org.portfolio.status === "assessed"
  ) {
    portfolioObservations.push(
      observation(
        "brief.portfolio.score",
        BRIEF_TEMPLATES.portfolioScore(
          org.portfolio.portfolioPriorityScore.pointsAwarded,
          org.portfolio.portfolioPriorityScore.pointsPossible,
          observedFitBandLabelFor(org.portfolio.portfolioPriorityScore.band),
        ),
        "assessment",
      ),
    );
  } else {
    portfolioObservations.push(
      observation(
        "brief.portfolio.score",
        suppressDetails
          ? BRIEF_TEMPLATES.notPublishedObservation
          : BRIEF_TEMPLATES.portfolioScoreUnavailable,
        suppressDetails ? "not_published" : "unavailable",
      ),
    );
  }

  const portfolio = section(
    "portfolio",
    "Institutional portfolio summary projected from the existing assessment.",
    portfolioObservations,
  );

  const assessmentState = section(
    "assessment_state",
    state === "available"
      ? "Assessment and publication state for this synthetic organization."
      : input.state === "insufficient_evidence"
        ? BRIEF_TEMPLATES.insufficientState
        : BRIEF_TEMPLATES.notPublishedState,
    [
      observation(
        "brief.assessment.status",
        BRIEF_TEMPLATES.portfolioStatus(statusLabel(org.portfolio.status)),
        "assessment",
      ),
      observation(
        "brief.assessment.publication",
        suppressDetails
          ? BRIEF_TEMPLATES.notPublishedObservation
          : BRIEF_TEMPLATES.assessmentPublication(label(org.portfolio.publicationEligibility)),
        suppressDetails ? "not_published" : "assessment",
      ),
    ],
  );

  const capabilityObservations = capabilities.map((capability, index) => {
    if (
      capability.pointsAwarded !== null &&
      capability.pointsPossible !== null &&
      capability.fitBandLabel
    ) {
      return observation(
        `brief.capability.${index + 1}.fit`,
        BRIEF_TEMPLATES.capabilityFit(
          capability.capabilityName,
          capability.pointsAwarded,
          capability.pointsPossible,
          capability.fitBandLabel,
        ),
        "assessment",
      );
    }
    return observation(
      `brief.capability.${index + 1}.fit`,
      BRIEF_TEMPLATES.capabilityStatus(capability.capabilityName, capability.statusLabel),
      capability.publicationEligibility === "unavailable" ? "not_published" : "unavailable",
    );
  });
  const capabilitiesSection = section(
    "capabilities",
    "Five synthetic capability summaries projected from existing assessments.",
    capabilityObservations,
  );

  const qualityObservations: BriefObservationView[] = suppressNumeric
    ? [
        observation(
          "brief.quality.withheld",
          suppressDetails
            ? BRIEF_TEMPLATES.notPublishedObservation
            : BRIEF_TEMPLATES.qualityWithheld,
          suppressDetails ? "not_published" : "unavailable",
        ),
      ]
    : [
        observation(
          "brief.quality.confidence",
          BRIEF_TEMPLATES.qualityConfidence(label(org.portfolio.confidence)),
          "assessment",
        ),
        observation(
          "brief.quality.freshness",
          BRIEF_TEMPLATES.qualityFreshness(label(org.portfolio.freshness)),
          "assessment",
        ),
        observation(
          "brief.quality.completeness",
          BRIEF_TEMPLATES.qualityCompleteness(label(org.portfolio.completeness)),
          "assessment",
        ),
      ];
  const quality = section(
    "quality_signals",
    "Fit, confidence, freshness, and completeness where publication permits.",
    qualityObservations,
  );

  const evidenceObservations: BriefObservationView[] = [
    observation(
      "brief.evidence.coverage",
      evidenceCoverage.message,
      permittedEvidence.length > 0 ? "limitation" : "unavailable",
      permittedEvidence.slice(0, 5).map((item) => item.title),
    ),
  ];
  const evidenceSection = section(
    "evidence_coverage",
    "Permitted evidence coverage for this brief.",
    evidenceObservations,
  );

  const provenanceObservations =
    provenanceSummaries.length === 0
      ? [observation("brief.provenance.none", BRIEF_TEMPLATES.provenanceNone, "unavailable")]
      : provenanceSummaries.map((row, index) =>
          observation(
            `brief.provenance.${index + 1}`,
            BRIEF_TEMPLATES.provenanceRow(
              row.label,
              row.licenseStatusLabel,
              row.accessClassificationLabel,
            ),
            "evidence",
          ),
        );
  const provenanceSection = section(
    "provenance",
    "Permitted provenance summaries linked to visible evidence.",
    provenanceObservations,
  );

  const observationSectionRows =
    suppressDetails || permittedEvidence.length === 0
      ? [
          observation(
            "brief.observations.none",
            suppressDetails
              ? BRIEF_TEMPLATES.notPublishedObservation
              : BRIEF_TEMPLATES.observationNone,
            suppressDetails ? "not_published" : "unavailable",
          ),
        ]
      : permittedEvidence.slice(0, 5).map((item, index) => {
          const provenance = item.provenanceId ? provenanceById.get(item.provenanceId) : undefined;
          const linkedLabels =
            provenance && provenance.accessClassification !== "restricted"
              ? [provenance.sourceName]
              : [];
          return observation(
            `brief.observations.${index + 1}`,
            BRIEF_TEMPLATES.observationEvidence(item.title, label(item.epistemicStatus)),
            "evidence",
            [item.title],
            linkedLabels,
          );
        });

  const observationsSection = section(
    "observations",
    "Material evidence-backed observations with permitted source relationships.",
    observationSectionRows,
  );

  const gapObservations: BriefObservationView[] = [];
  if (suppressDetails) {
    gapObservations.push(
      observation("brief.gaps.suppressed", BRIEF_TEMPLATES.gapSuppressed, "not_published"),
    );
  } else {
    for (const assessment of orderedAssessments(org)) {
      if (assessment.fit.status !== "insufficient_evidence") continue;
      const codes = insufficientReasonCodes({
        ...org,
        capabilityAssessments: [assessment],
      });
      gapObservations.push(
        observation(
          `brief.gaps.capability.${assessment.capabilityId}`,
          BRIEF_TEMPLATES.gapInsufficient(
            capabilityNameById(assessment.capabilityId),
            reasonSummaryFromCodes(codes),
          ),
          "gap",
        ),
      );
    }
    if (
      org.portfolio.coverage.assessedPriorityWeight < org.portfolio.coverage.enabledPriorityWeight
    ) {
      gapObservations.push(observation("brief.gaps.coverage", BRIEF_TEMPLATES.gapCoverage, "gap"));
    }
    if (gapObservations.length === 0) {
      gapObservations.push(observation("brief.gaps.none", BRIEF_TEMPLATES.gapNone, "limitation"));
    }
  }
  // Sanitize gap keys so capability IDs never appear in serialized view
  const sanitizedGaps = gapObservations.map((item, index) =>
    observation(
      item.key.startsWith("brief.gaps.capability.")
        ? `brief.gaps.capability.${index + 1}`
        : item.key,
      item.language,
      item.classification,
      item.supportingEvidenceTitles,
      item.supportingProvenanceLabels,
    ),
  );
  const gapsSection = section(
    "gaps",
    "Gaps and unresolved rules without capability-absence claims.",
    sanitizedGaps,
  );

  const overlayObservations: BriefObservationView[] =
    overlay.access === "restricted"
      ? [observation("brief.overlay.restricted", BRIEF_TEMPLATES.overlayRestricted, "limitation")]
      : overlay.access === "omitted"
        ? [observation("brief.overlay.omitted", overlay.message, "unavailable")]
        : [
            observation(
              "brief.overlay.available",
              BRIEF_TEMPLATES.overlayAvailable(
                overlay.relationshipStatusLabel,
                overlay.matchStatusLabel,
              ),
              "assessment",
            ),
          ];
  const overlaySection = section(
    "overlay",
    "Permission-appropriate overlay context. Tenant overlay notes are never included.",
    overlayObservations,
  );

  const methodology = section("methodology", "Methodology versions and limitations.", [
    observation(
      "brief.methodology.version",
      BRIEF_TEMPLATES.methodologyVersion(meta.methodologyVersion, meta.datasetVersion),
      "limitation",
    ),
    observation(
      "brief.methodology.limitation",
      BRIEF_TEMPLATES.methodologyLimitation,
      "limitation",
    ),
  ]);

  const disclaimer = section("disclaimer", BRIEF_TEMPLATES.disclaimer, [
    observation("brief.disclaimer.non_recommendation", BRIEF_TEMPLATES.disclaimer, "limitation"),
  ]);

  const sections = [
    identity,
    purpose,
    profile,
    portfolio,
    assessmentState,
    capabilitiesSection,
    quality,
    evidenceSection,
    provenanceSection,
    observationsSection,
    gapsSection,
    overlaySection,
    methodology,
    disclaimer,
  ];

  if (sections.map((item) => item.key).join(",") !== BRIEF_SECTION_ORDER.join(",")) {
    throw new Error("Brief section order drifted from BRIEF_SECTION_ORDER.");
  }

  return Object.freeze(sections);
}

function projectBriefDocument(
  context: AuthorizationContext,
  org: OrgResearchRecord,
  briefRef: ReturnType<typeof briefPublicRefFor>,
): BriefDocumentPageView {
  const { state, stateMessage } = resolveDocumentState(org);
  const store = loadFinancialInstitutionsStore();
  const evidence = store.evidence.filter(
    (item) => item.tenantId === context.tenant.id && item.organizationId === org.organizationId,
  );
  const provenanceById = new Map(store.provenance.map((item) => [item.id, item] as const));
  const permitted = visibleEvidence(context, org, evidence, provenanceById);
  const canReadEvidence = hasPermission(context, "evidence:read");
  const evidenceCoverage = buildEvidenceCoverage(permitted.length, canReadEvidence);
  const provenanceSummaries = buildProvenanceSummaries(permitted, provenanceById);
  const capabilities = buildCapabilities(org, state);
  const overlay = buildOverlayProjection(context, org);
  const sections = buildSections({
    org,
    state,
    capabilities,
    evidenceCoverage,
    provenanceSummaries,
    permittedEvidence: permitted,
    provenanceById,
    overlay,
  });

  return {
    state,
    stateMessage,
    briefPublicRef: briefRef,
    organizationPublicRef: org.publicRef as OrganizationPublicRef,
    displayName: org.displayName,
    detailHref: `/organizations/${org.publicRef}`,
    directoryHref: briefDirectoryHref(org.publicRef),
    title: `Institutional brief — ${org.displayName}`,
    asOfLabel: `As of ${manifest().asAssessedAt}`,
    freshnessStatement: `Portfolio freshness: ${label(org.portfolio.freshness)}.`,
    purposeStatement: BRIEF_TEMPLATES.purpose,
    sections,
    capabilities,
    evidenceCoverage,
    provenanceSummaries,
    overlay,
    manifest: manifest(),
  };
}

/**
 * Directory: authorized candidate catalog with opaque refs.
 */
export async function buildBriefDirectoryPageView(
  context: AuthorizationContext,
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): Promise<BriefDirectoryPageView> {
  try {
    requireBriefReadAccess(context);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      const view = deepFreeze({
        state: "unauthorized" as const,
        stateMessage: "Briefs require brief, organization, and assessment read permission.",
        selectedOrgRef: null,
        selectedBriefHref: null,
        candidates: Object.freeze([]),
        selectionGuidance: "Ask an administrator if you need brief access.",
        manifest: manifest(),
      });
      assertNoLeakage(view);
      return view;
    }
    throw error;
  }

  const parsed = parseBriefDirectorySearchParams(searchParams);
  if (!parsed.ok) {
    return finalizeBriefView(context, {
      state: "malformed" as const,
      stateMessage:
        "The brief directory selection is malformed. Use an opaque organization reference.",
      selectedOrgRef: null,
      selectedBriefHref: null,
      candidates: Object.freeze([]),
      selectionGuidance: "Return to the brief directory and choose an eligible organization.",
      manifest: manifest(),
    });
  }

  try {
    const model = getTenantResearchReadModel(context);
    const selected = parsed.query.orgRef;
    const candidates: BriefDirectoryCandidateView[] = [...model.organizations]
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "en"))
      .map((org) => {
        const briefRef = briefPublicRefFor(context.tenant.id, org.organizationId);
        return {
          displayName: org.displayName,
          organizationType: label(org.organizationType),
          assessmentStatusLabel: statusLabel(org.portfolio.status),
          organizationPublicRef: org.publicRef as OrganizationPublicRef,
          briefPublicRef: briefRef,
          briefHref: briefDocumentHref(briefRef),
          selected: selected !== null && org.publicRef === selected,
        };
      });

    if (selected) {
      const match = candidates.find((item) => item.organizationPublicRef === selected);
      if (!match) {
        return finalizeBriefView(context, {
          state: "not_found" as const,
          stateMessage: "No organization matched the opaque reference in this tenant.",
          selectedOrgRef: selected,
          selectedBriefHref: null,
          candidates: Object.freeze(candidates),
          selectionGuidance: "Choose an eligible organization from the directory list.",
          manifest: manifest(),
        });
      }
      return finalizeBriefView(context, {
        state: "available" as const,
        stateMessage: `Organization selected for briefing: ${match.displayName}.`,
        selectedOrgRef: selected,
        selectedBriefHref: match.briefHref,
        candidates: Object.freeze(candidates),
        selectionGuidance: "Open the selected brief, or choose a different organization.",
        manifest: manifest(),
      });
    }

    return finalizeBriefView(context, {
      state: candidates.length === 0 ? ("empty" as const) : ("available" as const),
      stateMessage:
        candidates.length === 0
          ? "No organizations are available for briefing in this workspace."
          : "Select an organization to open a synthetic institutional brief.",
      selectedOrgRef: null,
      selectedBriefHref: null,
      candidates: Object.freeze(candidates),
      selectionGuidance: "Briefs are generated from existing assessments. No ranking is implied.",
      manifest: manifest(),
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      const view = deepFreeze({
        state: "unauthorized" as const,
        stateMessage: "Briefs require brief, organization, and assessment read permission.",
        selectedOrgRef: null,
        selectedBriefHref: null,
        candidates: Object.freeze([]),
        selectionGuidance: "Ask an administrator if you need brief access.",
        manifest: manifest(),
      });
      assertNoLeakage(view);
      return view;
    }
    const view = deepFreeze({
      state: "error" as const,
      stateMessage: "The brief directory is temporarily unavailable.",
      selectedOrgRef: null,
      selectedBriefHref: null,
      candidates: Object.freeze([]),
      selectionGuidance: "Retry shortly or return to the portfolio overview.",
      manifest: manifest(),
    });
    assertNoLeakage(view);
    return view;
  }
}

/**
 * Document: deterministic evidence-backed brief projections (Batch 2).
 */
export async function buildBriefDocumentPageView(
  context: AuthorizationContext,
  briefRefParam: string,
): Promise<BriefDocumentPageView> {
  const directoryHref = briefDirectoryHref();

  try {
    requireBriefReadAccess(context);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      const view = deepFreeze(
        emptyDocumentShell({
          state: "unauthorized",
          stateMessage: "Briefs require brief, organization, and assessment read permission.",
          title: "Brief restricted",
          directoryHref,
        }),
      );
      assertNoLeakage(view);
      return view;
    }
    throw error;
  }

  const briefRef = parseBriefRouteParam(briefRefParam);
  if (!briefRef) {
    return finalizeBriefView(
      context,
      emptyDocumentShell({
        state: "malformed",
        stateMessage: "The brief reference is malformed. Use an opaque brief route token.",
        title: "Brief unavailable",
        directoryHref,
      }),
    );
  }

  try {
    const model = getTenantResearchReadModel(context);
    const org = model.organizations.find(
      (item) => briefPublicRefFor(context.tenant.id, item.organizationId) === briefRef,
    );
    if (!org) {
      return finalizeBriefView(
        context,
        emptyDocumentShell({
          state: "not_found",
          stateMessage: "No brief matched the opaque reference in this tenant.",
          title: "Brief not found",
          directoryHref,
          briefPublicRef: briefRef,
        }),
      );
    }

    if (model.methodologyVersion !== METHODOLOGY_VERSION) {
      return finalizeBriefView(
        context,
        emptyDocumentShell({
          state: "error",
          stateMessage: "This brief is temporarily unavailable.",
          title: "Brief unavailable",
          directoryHref,
          briefPublicRef: briefRef,
        }),
      );
    }

    const projected = projectBriefDocument(context, org, briefRef);
    return finalizeBriefView(context, projected);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      const view = deepFreeze(
        emptyDocumentShell({
          state: "unauthorized",
          stateMessage: "Briefs require brief, organization, and assessment read permission.",
          title: "Brief restricted",
          directoryHref,
          briefPublicRef: briefRef,
        }),
      );
      assertNoLeakage(view);
      return view;
    }
    const view = deepFreeze(
      emptyDocumentShell({
        state: "error",
        stateMessage: "This brief is temporarily unavailable.",
        title: "Brief unavailable",
        directoryHref,
        briefPublicRef: briefRef,
      }),
    );
    assertNoLeakage(view);
    return view;
  }
}
