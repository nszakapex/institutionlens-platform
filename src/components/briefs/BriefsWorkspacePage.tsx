import Link from "next/link";
import type { BriefDirectoryPageView } from "@/application/brief-view-models";
import { BriefSelectionForm } from "@/components/briefs/BriefSelectionForm";
import {
  EmptyState,
  ErrorState,
  RestrictedState,
  SyntheticNotice,
} from "@/components/status/States";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";

/**
 * Brief directory workspace — Server Component.
 * Selection mutation is delegated to a narrow client island.
 */
export function BriefsWorkspacePage({ view }: { view: BriefDirectoryPageView }) {
  if (view.state === "unauthorized") {
    return (
      <div className="il-brief-page">
        <PageHeader title="Briefs" description={view.stateMessage} />
        <RestrictedState title="Briefs restricted" description={view.stateMessage} />
        <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
      </div>
    );
  }

  if (view.state === "malformed") {
    return (
      <div className="il-brief-page">
        <PageHeader title="Briefs" description={view.stateMessage} />
        <ErrorState title="Malformed selection" description={view.stateMessage} />
        <p className="il-filter-actions il-no-print">
          <Link className="il-button il-button--secondary il-button--md" href="/briefs">
            Clear selection
          </Link>
        </p>
        <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
      </div>
    );
  }

  if (view.state === "error") {
    return (
      <div className="il-brief-page">
        <PageHeader title="Briefs" description={view.stateMessage} />
        <ErrorState title="Brief directory unavailable" description={view.stateMessage} />
        <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
      </div>
    );
  }

  if (view.state === "empty" || view.candidates.length === 0) {
    return (
      <div className="il-brief-page">
        <PageHeader title="Briefs" description={view.stateMessage} />
        <EmptyState title="No briefs available" description={view.stateMessage} />
        <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
      </div>
    );
  }

  const availableCount = view.candidates.filter((item) => item.briefState === "available").length;
  const insufficientCount = view.candidates.filter(
    (item) => item.briefState === "insufficient_evidence",
  ).length;
  const notPublishedCount = view.candidates.filter(
    (item) => item.briefState === "not_published",
  ).length;

  return (
    <div className="il-brief-page">
      <PageHeader
        title="Briefs"
        description="Deterministic institutional briefs for research and outreach preparation."
        meta={
          <StatusBadge tone="info">Synthetic · {view.candidates.length} organizations</StatusBadge>
        }
      />
      <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>

      <p className="il-research-disclaimer" role="note">
        {view.manifest.nonRecommendationDisclaimer}
      </p>

      <section className="il-brief-intro" aria-labelledby="brief-what-heading">
        <h2 id="brief-what-heading" className="il-section-title">
          What an institutional brief contains
        </h2>
        <p>
          Each brief summarizes one organization from authorized synthetic read models: profile,
          portfolio assessment state, five capability summaries, evidence coverage, gaps,
          permission-appropriate overlay context, methodology, and an explicit non-recommendation
          disclaimer. Briefs do not rank organizations or provide investment advice.
        </p>
        <p className="il-muted">{view.selectionGuidance}</p>
        <p className="il-muted" role="status">
          Directory mix: {availableCount} available, {insufficientCount} insufficient evidence,{" "}
          {notPublishedCount} not published. Listing an organization does not guarantee a fully
          publishable assessment.
        </p>
        <p className="il-muted">
          As of {view.manifest.asAssessedAt}. Methodology {view.manifest.methodologyVersion}.
          Dataset {view.manifest.datasetVersion}.
        </p>
      </section>

      {view.state === "not_found" ? (
        <ErrorState title="Organization not found" description={view.stateMessage} />
      ) : null}

      {view.selectedBriefHref ? (
        <p className="il-filter-actions il-no-print">
          <Link
            className="il-button il-button--primary il-button--md"
            href={view.selectedBriefHref}
          >
            Open selected brief
          </Link>
        </p>
      ) : null}

      <section aria-labelledby="brief-directory-heading">
        <h2 id="brief-directory-heading" className="il-section-title">
          Eligible organizations
        </h2>
        <BriefSelectionForm
          key={view.selectedOrgRef ?? "none"}
          selectedOrgRef={view.selectedOrgRef}
          candidates={view.candidates.map((candidate) => ({
            displayName: candidate.displayName,
            organizationType: candidate.organizationType,
            assessmentStatusLabel: candidate.assessmentStatusLabel,
            briefStateLabel: candidate.briefStateLabel,
            organizationPublicRef: candidate.organizationPublicRef,
            briefHref: candidate.briefHref,
            selected: candidate.selected,
          }))}
        />
      </section>

      <section className="il-brief-directory-legend" aria-labelledby="brief-state-legend">
        <h2 id="brief-state-legend" className="il-section-title">
          Brief state labels
        </h2>
        <dl className="il-brief-state-legend">
          <div>
            <dt>
              <span className="il-brief-state-pill il-brief-state-pill--available">
                Available brief
              </span>
            </dt>
            <dd>Publication rules allow projecting assessment outputs where evidence permits.</dd>
          </div>
          <div>
            <dt>
              <span className="il-brief-state-pill il-brief-state-pill--insufficient">
                Insufficient evidence
              </span>
            </dt>
            <dd>Gaps are explained. Missing evidence is not treated as a missing capability.</dd>
          </div>
          <div>
            <dt>
              <span className="il-brief-state-pill il-brief-state-pill--not-published">
                Not published
              </span>
            </dt>
            <dd>Numeric or external-ready assessment details are withheld by publication rules.</dd>
          </div>
        </dl>
      </section>

      <p className="il-research-disclaimer" role="note">
        {view.manifest.permittedUse} {view.manifest.nonRecommendationDisclaimer}
      </p>
    </div>
  );
}
