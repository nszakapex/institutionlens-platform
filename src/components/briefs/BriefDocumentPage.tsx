import Link from "next/link";
import type { BriefDocumentPageView } from "@/application/brief-view-models";
import {
  EmptyState,
  ErrorState,
  RestrictedState,
  SyntheticNotice,
} from "@/components/status/States";
import { PageHeader } from "@/components/ui/PageHeader";

/**
 * Batch 1 brief document shell — Server Component only.
 * Full section layout, print styling, and a11y polish arrive in Batches 2–3.
 */
export function BriefDocumentPage({ view }: { view: BriefDocumentPageView }) {
  if (view.state === "unauthorized") {
    return (
      <div>
        <PageHeader title={view.title} description={view.stateMessage} />
        <RestrictedState title="Brief restricted" description={view.stateMessage} />
        <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
      </div>
    );
  }

  if (view.state === "malformed") {
    return (
      <div>
        <PageHeader title={view.title} description={view.stateMessage} />
        <ErrorState title="Malformed brief reference" description={view.stateMessage} />
        <p className="il-filter-actions">
          <Link className="il-button il-button--secondary il-button--md" href={view.directoryHref}>
            Back to brief directory
          </Link>
        </p>
        <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
      </div>
    );
  }

  if (view.state === "not_found") {
    return (
      <div>
        <PageHeader title={view.title} description={view.stateMessage} />
        <EmptyState
          title="Brief not found"
          description={view.stateMessage}
          actionLabel="Back to brief directory"
          actionHref={view.directoryHref}
        />
        <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
      </div>
    );
  }

  if (view.state === "error") {
    return (
      <div>
        <PageHeader title={view.title} description={view.stateMessage} />
        <ErrorState title="Brief unavailable" description={view.stateMessage} />
        <p className="il-filter-actions">
          <Link className="il-button il-button--secondary il-button--md" href={view.directoryHref}>
            Back to brief directory
          </Link>
        </p>
        <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
      </div>
    );
  }

  return (
    <article>
      <PageHeader
        title={view.title}
        description={view.stateMessage}
        meta={
          view.asOfLabel ? (
            <p className="il-muted">
              {view.asOfLabel}
              {view.freshnessStatement ? ` · ${view.freshnessStatement}` : null}
            </p>
          ) : null
        }
      />

      <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>

      <p className="il-research-disclaimer" role="note">
        {view.purposeStatement} {view.manifest.permittedUse}
      </p>
      <p className="il-research-disclaimer" role="note">
        {view.manifest.nonRecommendationDisclaimer}
      </p>

      {view.state === "insufficient_evidence" || view.state === "not_published" ? (
        <p className="il-state il-state--empty" role="status">
          {view.stateMessage}
        </p>
      ) : null}

      <section aria-labelledby="brief-shell-sections">
        <h2 id="brief-shell-sections" className="il-section-title">
          Brief sections
        </h2>
        <p className="il-muted">
          Batch 1 establishes the fail-closed route and state shell. Evidence-backed section
          projections arrive in Batch 2.
        </p>
        <ul>
          {view.sectionPlaceholders.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <nav className="il-filter-actions" aria-label="Brief navigation">
        <Link className="il-button il-button--secondary il-button--md" href={view.directoryHref}>
          Brief directory
        </Link>
        {view.detailHref ? (
          <Link className="il-button il-button--ghost il-button--md" href={view.detailHref}>
            Organization detail
          </Link>
        ) : null}
      </nav>

      <p className="il-research-disclaimer" role="note">
        Methodology {view.manifest.methodologyVersion}. Dataset {view.manifest.datasetVersion}.{" "}
        {view.manifest.nonRecommendationDisclaimer}
      </p>
    </article>
  );
}
