import "server-only";

import type { AuthorizationContext } from "@/authorization/context";
import { assertPermission } from "@/authorization/context";
import {
  briefDirectoryHref,
  briefDocumentHref,
  parseBriefDirectorySearchParams,
  parseBriefRouteParam,
} from "@/application/brief-query";
import type {
  BriefDirectoryCandidateView,
  BriefDirectoryPageView,
  BriefDocumentPageView,
  BriefManifestView,
} from "@/application/brief-view-models";
import { getTenantResearchReadModel } from "@/application/research-read-model";
import { AuthorizationError } from "@/domain/errors";
import { briefPublicRefFor } from "@/domain/brief-public-ref";
import type { OrganizationPublicRef } from "@/domain/organization-public-ref";
import { FINANCIAL_INSTITUTIONS_FIXTURE_VERSION } from "@/verticals/financial-institutions/schema";
import {
  ASSESSED_AT,
  METHODOLOGY_VERSION,
} from "@/verticals/financial-institutions/assessment/methodology";
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
    permittedUse:
      "Intended for internal research and outreach preparation within this synthetic demo workspace.",
    nonRecommendationDisclaimer:
      "This brief is not an investment recommendation, purchase forecast, or ranking of organizations.",
  };
}

const FORBIDDEN =
  /org_syn_fi_|ev_syn_|prov_syn_|cap_syn_|overlay_syn_|tenant_demo|principal_demo|demo-tenant-local|demo-principal-local|Synthetic prospect flagged|private note/i;

function assertNoLeakage(payload: unknown): void {
  const serialized = JSON.stringify(payload);
  if (FORBIDDEN.test(serialized)) {
    throw new Error("Brief view model failed privacy redaction checks.");
  }
  if (/"organizationId"|"capabilityId"|"evidenceId"|"provenanceId"/.test(serialized)) {
    throw new Error("Brief view model exposed raw internal identifiers.");
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

/**
 * Batch 1 directory shell: authorized candidate catalog with opaque refs.
 * Full brief projections arrive in Batch 2; rich UI in Batch 3.
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
 * Batch 1 document shell: resolve opaque brief ref and emit state only.
 * Section projections are deferred to Batch 2.
 */
export async function buildBriefDocumentPageView(
  context: AuthorizationContext,
  briefRefParam: string,
): Promise<BriefDocumentPageView> {
  const directoryHref = briefDirectoryHref();
  const purpose =
    "This synthetic brief summarizes permitted research signals for outreach preparation.";

  try {
    requireBriefReadAccess(context);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      const view = deepFreeze({
        state: "unauthorized" as const,
        stateMessage: "Briefs require brief, organization, and assessment read permission.",
        briefPublicRef: null,
        organizationPublicRef: null,
        displayName: null,
        detailHref: null,
        directoryHref,
        title: "Brief restricted",
        asOfLabel: null,
        freshnessStatement: null,
        purposeStatement: purpose,
        sectionPlaceholders: Object.freeze([]),
        manifest: manifest(),
      });
      assertNoLeakage(view);
      return view;
    }
    throw error;
  }

  const briefRef = parseBriefRouteParam(briefRefParam);
  if (!briefRef) {
    return finalizeBriefView(context, {
      state: "malformed" as const,
      stateMessage: "The brief reference is malformed. Use an opaque brief route token.",
      briefPublicRef: null,
      organizationPublicRef: null,
      displayName: null,
      detailHref: null,
      directoryHref,
      title: "Brief unavailable",
      asOfLabel: null,
      freshnessStatement: null,
      purposeStatement: purpose,
      sectionPlaceholders: Object.freeze([]),
      manifest: manifest(),
    });
  }

  try {
    const model = getTenantResearchReadModel(context);
    const org = model.organizations.find(
      (item) => briefPublicRefFor(context.tenant.id, item.organizationId) === briefRef,
    );
    if (!org) {
      return finalizeBriefView(context, {
        state: "not_found" as const,
        stateMessage: "No brief matched the opaque reference in this tenant.",
        briefPublicRef: briefRef,
        organizationPublicRef: null,
        displayName: null,
        detailHref: null,
        directoryHref,
        title: "Brief not found",
        asOfLabel: null,
        freshnessStatement: null,
        purposeStatement: purpose,
        sectionPlaceholders: Object.freeze([]),
        manifest: manifest(),
      });
    }

    const publication = org.portfolio.publicationEligibility;
    let state: BriefDocumentPageView["state"] = "available";
    let stateMessage = "Synthetic brief shell ready for section projections.";
    if (org.portfolio.status === "insufficient_evidence") {
      state = "insufficient_evidence";
      stateMessage =
        "Assessment has insufficient evidence. Gaps will be explained without treating them as missing capability.";
    } else if (publication !== "eligible" && publication !== "internal_only") {
      state = "not_published";
      stateMessage =
        "Publication rules withhold some numeric or external-ready content for this organization.";
    }

    return finalizeBriefView(context, {
      state,
      stateMessage,
      briefPublicRef: briefRef,
      organizationPublicRef: org.publicRef as OrganizationPublicRef,
      displayName: org.displayName,
      detailHref: `/organizations/${org.publicRef}`,
      directoryHref: briefDirectoryHref(org.publicRef),
      title: `Institutional brief — ${org.displayName}`,
      asOfLabel: `As of ${manifest().asAssessedAt}`,
      freshnessStatement: `Portfolio freshness: ${org.portfolio.freshness.replace(/_/g, " ")}.`,
      purposeStatement: purpose,
      sectionPlaceholders: Object.freeze([
        "Profile, portfolio, capabilities, evidence, gaps, overlay, and methodology sections arrive in Batch 2.",
      ]),
      manifest: manifest(),
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      const view = deepFreeze({
        state: "unauthorized" as const,
        stateMessage: "Briefs require brief, organization, and assessment read permission.",
        briefPublicRef: briefRef,
        organizationPublicRef: null,
        displayName: null,
        detailHref: null,
        directoryHref,
        title: "Brief restricted",
        asOfLabel: null,
        freshnessStatement: null,
        purposeStatement: purpose,
        sectionPlaceholders: Object.freeze([]),
        manifest: manifest(),
      });
      assertNoLeakage(view);
      return view;
    }
    const view = deepFreeze({
      state: "error" as const,
      stateMessage: "This brief is temporarily unavailable.",
      briefPublicRef: briefRef,
      organizationPublicRef: null,
      displayName: null,
      detailHref: null,
      directoryHref,
      title: "Brief unavailable",
      asOfLabel: null,
      freshnessStatement: null,
      purposeStatement: purpose,
      sectionPlaceholders: Object.freeze([]),
      manifest: manifest(),
    });
    assertNoLeakage(view);
    return view;
  }
}
