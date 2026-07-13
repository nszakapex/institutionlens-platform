/**
 * Fixed, reviewable brief language templates.
 * Keys are stable identifiers; language is not free-form LLM output.
 */

export const BRIEF_SECTION_TITLES = {
  identity: "Identity and brief metadata",
  purpose: "Purpose and permitted use",
  profile: "Organization profile",
  portfolio: "Portfolio and institutional summary",
  assessment_state: "Assessment and publication state",
  capabilities: "Capability summaries",
  quality_signals: "Fit, confidence, freshness, and completeness",
  evidence_coverage: "Evidence coverage",
  provenance: "Permitted provenance",
  observations: "Evidence-backed observations",
  gaps: "Gaps and unresolved rules",
  overlay: "Overlay context",
  methodology: "Methodology and limitations",
  disclaimer: "Non-recommendation disclaimer",
} as const;

export const BRIEF_TEMPLATES = {
  purpose:
    "This synthetic brief summarizes permitted research signals for outreach preparation within an authorized workspace.",
  permittedUse:
    "Intended for internal research and outreach preparation within this synthetic demo workspace.",
  disclaimer:
    "This brief is not an investment recommendation, purchase forecast, ranking of organizations, or sales-certainty statement.",
  identityAsOf: (asAssessedAt: string) =>
    `Brief content is as of the synthetic assessment timestamp ${asAssessedAt}.`,
  identityFreshness: (freshnessLabel: string) =>
    `Portfolio freshness from the existing assessment is ${freshnessLabel}.`,
  profileType: (organizationType: string) =>
    `Organization profile record lists type: ${organizationType}.`,
  profileLifecycle: (lifecycle: string) =>
    `Organization profile record lists lifecycle status: ${lifecycle}.`,
  profileLocation: (location: string) =>
    `Organization profile record lists location summary: ${location}.`,
  profileSourceNote:
    "Profile fields above come from the synthetic organization profile read model. They are not evidence-ledger observations.",
  portfolioStatus: (statusLabel: string) =>
    `Assessment output — portfolio assessment status: ${statusLabel}.`,
  portfolioCoverage: (assessed: number, enabled: number) =>
    `Assessment output — conditional coverage spans ${assessed} of ${enabled} enabled capabilities. Unassessed weight is not treated as negative alignment.`,
  portfolioScoreUnavailable:
    "Conditional portfolio score is unavailable under current assessment or publication rules.",
  portfolioScore: (awarded: number, possible: number, band: string) =>
    `Assessment output — conditional portfolio observed-alignment score from the existing assessment: ${awarded} of ${possible} (${band}).`,
  assessmentPublication: (eligibility: string) =>
    `Assessment output — publication eligibility for this synthetic assessment: ${eligibility}.`,
  capabilityStatus: (name: string, status: string) =>
    `Assessment output — ${name}: assessment status ${status}.`,
  capabilityFitUnavailable: (name: string) =>
    `${name}: observed-alignment points are not published for this capability under current rules.`,
  capabilityFit: (name: string, awarded: number, possible: number, band: string) =>
    `Assessment output — ${name}: existing assessment reports ${awarded} of ${possible} points (${band}).`,
  qualityConfidence: (label: string) => `Assessment output — confidence: ${label}.`,
  qualityFreshness: (label: string) => `Assessment output — freshness: ${label}.`,
  qualityCompleteness: (label: string) => `Assessment output — completeness: ${label}.`,
  qualityWithheld: "Quality signals are withheld under current publication or assessment rules.",
  evidenceCoverage: (count: number) =>
    `Permitted evidence coverage for this brief includes ${count} publishable synthetic evidence record${count === 1 ? "" : "s"}.`,
  evidenceNone:
    "No permitted evidence records are available for this brief under current authorization.",
  provenanceRow: (label: string, license: string, access: string) =>
    `Provenance ${label}: license ${license}; access ${access}.`,
  provenanceNone: "No permitted provenance summaries are available for this brief.",
  observationEvidence: (title: string, epistemic: string) =>
    `Observed evidence “${title}” is classified as ${epistemic} in the synthetic dataset.`,
  observationNone:
    "No additional evidence-backed observations are available under current publication and permission rules.",
  gapInsufficient: (capabilityName: string, summary: string) =>
    `${capabilityName}: ${summary} Missing evidence is not described as a missing capability.`,
  gapCoverage:
    "Portfolio coverage is conditional on assessed capabilities. Unresolved weight is not scored as negative alignment.",
  gapNone: "No unresolved gap statements are published for this brief state.",
  gapSuppressed:
    "Gap details that would reveal suppressed assessment values are withheld for this brief state.",
  overlayRestricted: "Overlay access is restricted for this workspace role.",
  overlayOmitted:
    "No tenant-provided relationship context. Relationship and capability-usage state remain unknown.",
  overlayAvailable: (relationship: string, match: string) =>
    `Overlay relationship ${relationship}; match status ${match}. Tenant overlay notes are never included.`,
  methodologyVersion: (version: string, dataset: string) =>
    `Methodology ${version}; dataset ${dataset}. Scores are projected from existing Phase 4 outputs and are not recalculated.`,
  methodologyLimitation:
    "Observed alignment is a deterministic prioritization heuristic for synthetic demo research only. Human judgment is required.",
  insufficientState:
    "Assessment has insufficient evidence. Gaps are explained without treating missing evidence as a missing capability.",
  notPublishedState:
    "Publication rules withhold numeric or external-ready assessment details for this organization.",
  unavailableObservation:
    "This statement is unavailable under current assessment or publication rules.",
  notPublishedObservation:
    "This statement is not published under current publication eligibility rules.",
} as const;
