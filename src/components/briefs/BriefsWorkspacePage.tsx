import Link from "next/link";
import type { BriefDirectoryPageView } from "@/application/brief-view-models";
import {
  EmptyState,
  ErrorState,
  RestrictedState,
  SyntheticNotice,
} from "@/components/status/States";
import { PageHeader } from "@/components/ui/PageHeader";

/**
 * Batch 1 directory shell — Server Component only.
 * Rich selection UI and print styling arrive in Batch 3.
 */
export function BriefsWorkspacePage({ view }: { view: BriefDirectoryPageView }) {
  if (view.state === "unauthorized") {
    return (
      <div>
        <PageHeader title="Briefs" description={view.stateMessage} />
        <RestrictedState title="Briefs restricted" description={view.stateMessage} />
        <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
      </div>
    );
  }

  if (view.state === "malformed") {
    return (
      <div>
        <PageHeader title="Briefs" description={view.stateMessage} />
        <ErrorState title="Malformed selection" description={view.stateMessage} />
        <p className="il-filter-actions">
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
      <div>
        <PageHeader title="Briefs" description={view.stateMessage} />
        <ErrorState title="Brief directory unavailable" description={view.stateMessage} />
        <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
      </div>
    );
  }

  if (view.state === "empty" || view.candidates.length === 0) {
    return (
      <div>
        <PageHeader title="Briefs" description={view.stateMessage} />
        <EmptyState title="No briefs available" description={view.stateMessage} />
        <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Briefs" description={view.stateMessage} />
      <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>

      <p className="il-research-disclaimer" role="note">
        {view.manifest.nonRecommendationDisclaimer}
      </p>
      <p className="il-muted">{view.selectionGuidance}</p>
      <p className="il-muted">
        As of {view.manifest.asAssessedAt}. Methodology {view.manifest.methodologyVersion}. Dataset{" "}
        {view.manifest.datasetVersion}.
      </p>

      {view.state === "not_found" ? (
        <ErrorState title="Organization not found" description={view.stateMessage} />
      ) : null}

      {view.selectedBriefHref ? (
        <p className="il-filter-actions">
          <Link
            className="il-button il-button--primary il-button--md"
            href={view.selectedBriefHref}
          >
            Open selected brief
          </Link>
          <Link className="il-button il-button--secondary il-button--md" href="/briefs">
            Clear selection
          </Link>
        </p>
      ) : null}

      <section aria-labelledby="brief-directory-heading">
        <h2 id="brief-directory-heading" className="il-section-title">
          Eligible organizations
        </h2>
        <ul className="il-result-stack">
          {view.candidates.map((candidate) => (
            <li key={candidate.organizationPublicRef}>
              <article
                className="il-result-record"
                aria-labelledby={`brief-candidate-${candidate.organizationPublicRef}`}
                aria-current={candidate.selected ? "true" : undefined}
              >
                <h3
                  id={`brief-candidate-${candidate.organizationPublicRef}`}
                  className="il-result-record-title"
                >
                  <Link href={candidate.briefHref}>{candidate.displayName}</Link>
                </h3>
                <p className="il-result-record-meta">
                  {candidate.organizationType} · {candidate.assessmentStatusLabel}
                  {candidate.selected ? " · Selected" : null}
                </p>
                <p className="il-filter-actions">
                  <Link
                    className="il-button il-button--secondary il-button--md"
                    href={candidate.briefHref}
                    aria-label={`Open brief for ${candidate.displayName}`}
                  >
                    Open brief
                  </Link>
                  <Link
                    className="il-button il-button--ghost il-button--md"
                    href={`/briefs?org=${candidate.organizationPublicRef}`}
                    aria-label={`Select ${candidate.displayName} in the brief directory`}
                  >
                    Select
                  </Link>
                </p>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <p className="il-research-disclaimer" role="note">
        {view.manifest.permittedUse} {view.manifest.nonRecommendationDisclaimer}
      </p>
    </div>
  );
}
