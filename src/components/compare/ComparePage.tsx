import Link from "next/link";
import type { ComparePageView } from "@/application/compare-view-models";
import {
  EmptyState,
  ErrorState,
  RestrictedState,
  SyntheticNotice,
} from "@/components/status/States";
import { StatusBadge } from "@/components/status/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";

/**
 * Server Component only — do not mark this module as a Client Component.
 * Selection mutation hrefs (removeHref, compareHref, detailHref) are precomputed
 * by the server compare service so this module never imports server-only URL or
 * opaque-ref helper modules.
 */
function words(value: string) {
  return value.replace(/_/g, " ");
}

export function ComparePage({ view }: { view: ComparePageView }) {
  if (view.state === "unauthorized") {
    return (
      <div className="il-phase7-page">
        <PageHeader title="Compare" description="Side-by-side synthetic organization comparison." />
        <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
        <RestrictedState title="Comparison restricted" description={view.stateMessage} />
      </div>
    );
  }

  if (view.state === "malformed" || view.state === "not_found") {
    return (
      <div className="il-phase7-page">
        <PageHeader title="Compare" description="Side-by-side synthetic organization comparison." />
        <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
        <EmptyState
          title="Comparison unavailable"
          description={view.stateMessage}
          actionLabel="Browse organizations"
          actionHref="/organizations"
        />
      </div>
    );
  }

  if (view.state === "error") {
    return (
      <div className="il-phase7-page">
        <PageHeader title="Compare" description="Side-by-side synthetic organization comparison." />
        <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
        <ErrorState title="Comparison unavailable" description={view.stateMessage} />
      </div>
    );
  }

  return (
    <div className="il-phase7-page">
      <PageHeader
        title="Compare"
        description={view.stateMessage}
        meta={
          <StatusBadge tone="info">Synthetic · max {view.manifest.maxOrganizations}</StatusBadge>
        }
      />
      <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
      <p className="il-research-disclaimer">{view.selectionGuidance}</p>

      {view.columns.length === 0 ? (
        <EmptyState
          title="No organizations selected"
          description={view.selectionGuidance}
          actionLabel="Open explorer"
          actionHref="/organizations"
        />
      ) : (
        <section className="il-compare-selection" aria-label="Selected organizations">
          <h2 className="il-section-title">Selected organizations</h2>
          <ul className="il-compare-selection-list">
            {view.columns.map((column) => (
              <li key={column.publicRef} className="il-compare-selection-item">
                <div>
                  <Link href={column.detailHref}>{column.displayName}</Link>
                  <p className="il-muted">{column.verticalSummary}</p>
                  <p className="il-muted">Assessment: {column.assessmentStatusLabel}</p>
                </div>
                <p className="il-filter-actions">
                  <Link
                    className="il-button il-button--secondary il-button--md"
                    href={column.removeHref}
                  >
                    Remove
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.missing.length > 0 ? (
        <section aria-label="Unresolved selections">
          <h2 className="il-section-title">Unresolved references</h2>
          <ul>
            {view.missing.map((slot) => (
              <li key={slot.publicRef}>{slot.message}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {view.state === "ready" ? (
        <section className="il-compare-matrix" aria-label="Comparison matrix">
          <h2 className="il-section-title">Side-by-side summary</h2>
          <p className="il-research-disclaimer">
            Scores are reused from existing assessments. No ranking or investment recommendation is
            implied.
          </p>
          <div className="il-compare-columns">
            {view.columns.map((column) => (
              <article key={column.publicRef} className="il-compare-column">
                <h3>{column.displayName}</h3>
                <p>{column.profileSummary}</p>
                <dl className="il-compare-facts">
                  <div>
                    <dt>Type</dt>
                    <dd>{column.organizationType}</dd>
                  </div>
                  <div>
                    <dt>Lifecycle</dt>
                    <dd>{column.lifecycleStatus}</dd>
                  </div>
                  <div>
                    <dt>Portfolio</dt>
                    <dd>{column.portfolioName}</dd>
                  </div>
                  <div>
                    <dt>Assessment</dt>
                    <dd>{column.assessmentStatusLabel}</dd>
                  </div>
                  <div>
                    <dt>Confidence</dt>
                    <dd>{words(column.confidence)}</dd>
                  </div>
                  <div>
                    <dt>Freshness</dt>
                    <dd>{words(column.freshness)}</dd>
                  </div>
                  <div>
                    <dt>Completeness</dt>
                    <dd>{words(column.assessmentCompleteness)}</dd>
                  </div>
                  <div>
                    <dt>Publication</dt>
                    <dd>{words(column.publicationEligibility)}</dd>
                  </div>
                  {column.conditionalScore ? (
                    <div>
                      <dt>Conditional portfolio score</dt>
                      <dd>
                        {column.conditionalScore.pointsAwarded}/
                        {column.conditionalScore.pointsPossible} ·{" "}
                        {column.conditionalScore.bandLabel}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <h4>Capabilities</h4>
                <ul>
                  {column.capabilities.map((capability) => (
                    <li key={capability.capabilityName}>
                      <strong>{capability.capabilityName}</strong> — {capability.statusLabel}
                      {capability.conditionalScore
                        ? ` · ${capability.conditionalScore.pointsAwarded}/${capability.conditionalScore.pointsPossible}`
                        : ""}
                    </li>
                  ))}
                </ul>
                <h4>Evidence coverage</h4>
                <ul>
                  {column.evidenceByCapability.map((row) => (
                    <li key={row.capabilityName}>
                      <strong>{row.capabilityName}</strong> — {row.publishedEvidenceCount} permitted
                      linked evidence · {row.provenanceSummary} · {row.gapLabel}
                    </li>
                  ))}
                </ul>
                {column.gapIndicators.length > 0 ? (
                  <>
                    <h4>Gap indicators</h4>
                    <ul>
                      {column.gapIndicators.map((gap) => (
                        <li key={gap}>{gap}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                <h4>Private overlay</h4>
                {column.overlay.access === "restricted" ? (
                  <p className="il-muted">Overlay access is restricted for this workspace role.</p>
                ) : column.overlay.access === "omitted" ? (
                  <p className="il-muted">{column.overlay.summary}</p>
                ) : (
                  <ul>
                    <li>Relationship: {column.overlay.relationshipStatusLabel}</li>
                    <li>Match: {column.overlay.matchStatusLabel}</li>
                    <li>Review: {column.overlay.reviewStatusLabel}</li>
                    <li>Source: {column.overlay.sourceClassificationLabel}</li>
                    {column.overlay.capabilityUsageLabels.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {column.warnings.length > 0 ? (
                  <ul className="il-warning-list">
                    {column.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
                <p>
                  <Link href={column.detailHref}>Open detail</Link>
                </p>
              </article>
            ))}
          </div>
          {view.differences.length > 0 ? (
            <section aria-label="Published value differences">
              <h3 className="il-section-title">Published differences</h3>
              <ul>
                {view.differences.map((row) => (
                  <li key={row.dimensionKey}>
                    <strong>{row.dimensionLabel}</strong> — {row.stateLabel}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {view.contrastNotes.map((note) => (
            <p key={note} className="il-research-disclaimer">
              {note}
            </p>
          ))}
        </section>
      ) : null}

      <p className="il-filter-actions">
        <Link className="il-button il-button--secondary il-button--md" href="/organizations">
          Browse organizations
        </Link>
        <Link className="il-button il-button--secondary il-button--md" href="/">
          Back to overview
        </Link>
      </p>
    </div>
  );
}
