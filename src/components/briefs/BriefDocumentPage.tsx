import Link from "next/link";
import type {
  BriefCapabilitySummaryView,
  BriefDocumentPageView,
  BriefObservationView,
  BriefSectionView,
} from "@/application/brief-view-models";
import {
  BRIEF_CLASSIFICATION_LABELS,
  BRIEF_DOCUMENT_STATE_LABELS,
  briefEvidenceAnchorId,
  type BriefClassificationLabelKey,
} from "@/lib/brief-labels";
import {
  EmptyState,
  ErrorState,
  RestrictedState,
  SyntheticNotice,
} from "@/components/status/States";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";

function classificationLabel(key: BriefObservationView["classification"]): string {
  return BRIEF_CLASSIFICATION_LABELS[key as BriefClassificationLabelKey] ?? key;
}

function ClassificationBadge({
  classification,
}: {
  classification: BriefObservationView["classification"];
}) {
  return (
    <span
      className={`il-brief-class il-brief-class--${classification}`}
      data-classification={classification}
    >
      <span className="il-brief-class-marker" aria-hidden="true">
        {classification === "evidence"
          ? "E"
          : classification === "assessment"
            ? "A"
            : classification === "gap"
              ? "G"
              : classification === "limitation"
                ? "L"
                : classification === "not_published"
                  ? "N"
                  : "U"}
      </span>
      <span className="il-brief-class-text">{classificationLabel(classification)}</span>
    </span>
  );
}

function ObservationBlock({ item }: { item: BriefObservationView }) {
  return (
    <div className="il-brief-observation">
      <div className="il-brief-observation-header">
        <ClassificationBadge classification={item.classification} />
      </div>
      <p className="il-brief-observation-body">{item.language}</p>
      {item.supportingEvidenceTitles.length > 0 ? (
        <p className="il-brief-support">
          <span className="il-brief-support-label">Supporting evidence: </span>
          {item.supportingEvidenceTitles.map((title, index) => (
            <span key={title}>
              {index > 0 ? "; " : null}
              <a
                className="il-brief-evidence-link"
                href={`#${briefEvidenceAnchorId(title)}`}
                aria-label={`Supporting evidence: ${title}`}
              >
                {title}
              </a>
            </span>
          ))}
        </p>
      ) : null}
      {item.supportingProvenanceLabels.length > 0 ? (
        <p className="il-brief-support">
          <span className="il-brief-support-label">Supporting provenance: </span>
          {item.supportingProvenanceLabels.join("; ")}
        </p>
      ) : null}
    </div>
  );
}

function capabilityHeadingId(name: string): string {
  return `brief-capability-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)}`;
}

function CapabilityBlock({ capability }: { capability: BriefCapabilitySummaryView }) {
  const headingId = capabilityHeadingId(capability.capabilityName);
  return (
    <div className="il-brief-capability" aria-labelledby={headingId}>
      <h3 id={headingId} className="il-brief-capability-title">
        {capability.capabilityName}
      </h3>
      <dl className="il-brief-fact-list">
        <div>
          <dt>Assessment status</dt>
          <dd>{capability.statusLabel}</dd>
        </div>
        <div>
          <dt>Publication</dt>
          <dd>{String(capability.publicationEligibility).replace(/_/g, " ")}</dd>
        </div>
        {capability.confidence ? (
          <div>
            <dt>Confidence</dt>
            <dd>{capability.confidence.replace(/_/g, " ")}</dd>
          </div>
        ) : null}
        {capability.freshness ? (
          <div>
            <dt>Freshness</dt>
            <dd>{capability.freshness.replace(/_/g, " ")}</dd>
          </div>
        ) : null}
        {capability.completeness ? (
          <div>
            <dt>Completeness</dt>
            <dd>{capability.completeness.replace(/_/g, " ")}</dd>
          </div>
        ) : null}
        {capability.fitBandLabel &&
        capability.pointsAwarded !== null &&
        capability.pointsPossible !== null ? (
          <div>
            <dt>Observed alignment</dt>
            <dd>
              {capability.pointsAwarded} of {capability.pointsPossible} ({capability.fitBandLabel})
            </dd>
          </div>
        ) : (
          <div>
            <dt>Observed alignment</dt>
            <dd>{capability.publicationNote}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function SectionBlock({
  section,
  capabilities,
  overlay,
}: {
  section: BriefSectionView;
  capabilities: readonly BriefCapabilitySummaryView[];
  overlay: BriefDocumentPageView["overlay"];
}) {
  return (
    <section
      className="il-brief-section il-research-section"
      aria-labelledby={`brief-section-${section.key}`}
      id={`section-${section.key}`}
    >
      <h2 id={`brief-section-${section.key}`} className="il-section-title">
        {section.title}
      </h2>
      <p className="il-muted">{section.summary}</p>
      {section.key === "capabilities" && capabilities.length > 0 ? (
        <div className="il-brief-capability-grid">
          {capabilities.map((capability) => (
            <CapabilityBlock key={capability.capabilityName} capability={capability} />
          ))}
        </div>
      ) : null}
      {section.key === "overlay" && overlay?.access === "available" ? (
        <dl className="il-brief-fact-list">
          <div>
            <dt>Relationship</dt>
            <dd>{overlay.relationshipStatusLabel}</dd>
          </div>
          <div>
            <dt>Match</dt>
            <dd>{overlay.matchStatusLabel}</dd>
          </div>
          <div>
            <dt>Review</dt>
            <dd>{overlay.reviewStatusLabel}</dd>
          </div>
          <div>
            <dt>Source classification</dt>
            <dd>{overlay.sourceClassificationLabel}</dd>
          </div>
          <div>
            <dt>Capability usage</dt>
            <dd>{overlay.capabilityUsageLabels.join("; ") || "None listed"}</dd>
          </div>
        </dl>
      ) : null}
      <ul className="il-brief-observation-list">
        {section.observations.map((item) => (
          <li key={item.key} className="il-brief-observation-item">
            <ObservationBlock item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Institutional brief document — Server Component.
 * Full research-document hierarchy for Batch 3.
 */
export function BriefDocumentPage({ view }: { view: BriefDocumentPageView }) {
  if (view.state === "unauthorized") {
    return (
      <div className="il-brief-page">
        <PageHeader title={view.title} description={view.stateMessage} />
        <RestrictedState title="Brief restricted" description={view.stateMessage} />
        <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
      </div>
    );
  }

  if (view.state === "malformed") {
    return (
      <div className="il-brief-page">
        <PageHeader title={view.title} description={view.stateMessage} />
        <ErrorState title="Malformed brief reference" description={view.stateMessage} />
        <p className="il-filter-actions il-no-print">
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
      <div className="il-brief-page">
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
      <div className="il-brief-page">
        <PageHeader title={view.title} description={view.stateMessage} />
        <ErrorState title="Brief unavailable" description={view.stateMessage} />
        <p className="il-filter-actions il-no-print">
          <Link className="il-button il-button--secondary il-button--md" href={view.directoryHref}>
            Back to brief directory
          </Link>
        </p>
        <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
      </div>
    );
  }

  const stateLabel =
    view.state in BRIEF_DOCUMENT_STATE_LABELS
      ? BRIEF_DOCUMENT_STATE_LABELS[view.state as keyof typeof BRIEF_DOCUMENT_STATE_LABELS]
      : view.state;
  const evidenceTitles = Array.from(
    new Set(
      view.sections.flatMap((section) =>
        section.observations.flatMap((item) => item.supportingEvidenceTitles),
      ),
    ),
  );

  return (
    <article className="il-brief-page il-brief-document">
      <PageHeader
        title={view.title}
        description={view.stateMessage}
        meta={
          <div className="il-brief-meta">
            <StatusBadge tone="info">{stateLabel}</StatusBadge>
            {view.asOfLabel ? <p className="il-muted">{view.asOfLabel}</p> : null}
            {view.freshnessStatement ? <p className="il-muted">{view.freshnessStatement}</p> : null}
          </div>
        }
      />

      <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>

      <aside
        className="il-brief-disclaimer-banner"
        role="note"
        aria-label="Non-recommendation notice"
      >
        <p className="il-research-disclaimer">{view.manifest.nonRecommendationDisclaimer}</p>
        <p className="il-muted">
          {view.purposeStatement} {view.manifest.permittedUse}
        </p>
      </aside>

      <nav className="il-section-nav il-no-print" aria-label="Brief sections">
        {view.sections.map((section) => (
          <a key={section.key} href={`#section-${section.key}`}>
            {section.title}
          </a>
        ))}
      </nav>

      {view.sections.map((section) => (
        <SectionBlock
          key={section.key}
          section={section}
          capabilities={view.capabilities}
          overlay={view.overlay}
        />
      ))}

      {evidenceTitles.length > 0 ? (
        <section
          className="il-brief-section il-research-section"
          aria-labelledby="brief-evidence-index-heading"
          id="section-evidence-index"
        >
          <h2 id="brief-evidence-index-heading" className="il-section-title">
            Permitted evidence index
          </h2>
          <p className="il-muted">
            Evidence titles referenced by observations. Source URLs are omitted when unavailable;
            synthetic provenance references may appear as plain text for print.
          </p>
          <ul className="il-brief-evidence-index">
            {evidenceTitles.map((title) => (
              <li key={title} id={briefEvidenceAnchorId(title)}>
                <p>
                  <strong>{title}</strong>
                </p>
                <p className="il-muted">Synthetic permitted evidence title — no external URL.</p>
              </li>
            ))}
          </ul>
          {view.provenanceSummaries.length > 0 ? (
            <ul className="il-brief-provenance-index">
              {view.provenanceSummaries.map((row) => (
                <li key={row.label}>
                  <p>
                    <strong>{row.label}</strong> · {row.licenseStatusLabel} ·{" "}
                    {row.accessClassificationLabel}
                  </p>
                  {row.sourceReferenceLabel ? (
                    <p className="il-brief-print-source il-print-only">
                      Source reference: {row.sourceReferenceLabel}
                    </p>
                  ) : (
                    <p className="il-muted">No printable source URL available.</p>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <footer className="il-brief-footer">
        <p className="il-research-disclaimer" role="note">
          {view.manifest.nonRecommendationDisclaimer}
        </p>
        <p className="il-muted">
          Methodology {view.manifest.methodologyVersion}. Dataset {view.manifest.datasetVersion}. As
          of {view.manifest.asAssessedAt}.
        </p>
        <nav className="il-filter-actions il-no-print" aria-label="Brief navigation">
          <Link className="il-button il-button--secondary il-button--md" href={view.directoryHref}>
            Brief directory
          </Link>
          {view.detailHref ? (
            <Link className="il-button il-button--ghost il-button--md" href={view.detailHref}>
              Organization detail
            </Link>
          ) : null}
        </nav>
      </footer>
    </article>
  );
}
