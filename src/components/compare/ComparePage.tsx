import Link from "next/link";
import type { ComparePageView } from "@/application/compare-view-models";
import { COMPARE_DIFFERENCE_STATE_LABELS } from "@/application/compare-view-models";
import { CompareSelectionForm } from "@/components/compare/CompareSelectionForm";
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
 * Selection mutation hrefs and candidate catalogs are precomputed by the server
 * compare service. The nested CompareSelectionForm is a narrow client island.
 */
function words(value: string) {
  return value.replace(/_/g, " ");
}

function DifferenceLegend() {
  return (
    <section className="il-compare-legend-panel" aria-labelledby="compare-diff-legend-heading">
      <h2 id="compare-diff-legend-heading" className="il-section-title">
        Difference labels
      </h2>
      <p className="il-muted">
        Labels describe published-value relationships only. They do not rank organizations or imply
        investment conclusions. Missing evidence is not treated as a missing capability.
      </p>
      <dl className="il-compare-diff-legend">
        {(
          Object.keys(COMPARE_DIFFERENCE_STATE_LABELS) as Array<
            keyof typeof COMPARE_DIFFERENCE_STATE_LABELS
          >
        ).map((key) => (
          <div key={key} className={`il-compare-diff-legend-item il-compare-diff--${key}`}>
            <dt>
              <span className="il-compare-diff-marker" aria-hidden="true">
                {key === "same"
                  ? "="
                  : key === "different"
                    ? "≠"
                    : key === "unavailable"
                      ? "?"
                      : "∅"}
              </span>{" "}
              {COMPARE_DIFFERENCE_STATE_LABELS[key]}
            </dt>
            <dd>
              {key === "same"
                ? "Every compared organization publishes the same value for this dimension."
                : key === "different"
                  ? "Compared organizations publish different values for this dimension."
                  : key === "unavailable"
                    ? "At least one organization has no publishable value for this dimension."
                    : "Values cannot be compared under current publication or assessment rules."}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function OrganizationColumn({ column }: { column: ComparePageView["columns"][number] }) {
  return (
    <article className="il-compare-column" aria-labelledby={`compare-org-${column.publicRef}`}>
      <header className="il-compare-column-header">
        <h3 id={`compare-org-${column.publicRef}`} className="il-compare-org-title">
          <Link href={column.detailHref}>{column.displayName}</Link>
        </h3>
        <p className="il-muted">{column.verticalSummary}</p>
        <p className="il-filter-actions">
          <Link className="il-button il-button--secondary il-button--md" href={column.removeHref}>
            Remove {column.displayName} from comparison
          </Link>
        </p>
      </header>

      <section aria-labelledby={`compare-profile-${column.publicRef}`}>
        <h4 id={`compare-profile-${column.publicRef}`}>Profile summary</h4>
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
            <dt>Location</dt>
            <dd>{column.locationLabel}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby={`compare-assessment-${column.publicRef}`}>
        <h4 id={`compare-assessment-${column.publicRef}`}>Assessment and publication</h4>
        <dl className="il-compare-facts">
          <div>
            <dt>Assessment state</dt>
            <dd>{column.assessmentStatusLabel}</dd>
          </div>
          <div>
            <dt>Portfolio</dt>
            <dd>{column.portfolioName}</dd>
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
          <div>
            <dt>Opportunity context</dt>
            <dd>{column.opportunityContextLabel}</dd>
          </div>
          {column.conditionalScore ? (
            <div>
              <dt>Conditional portfolio score</dt>
              <dd>
                {column.conditionalScore.pointsAwarded}/{column.conditionalScore.pointsPossible} ·{" "}
                {column.conditionalScore.bandLabel}
                <span className="il-score-disclosure">{column.conditionalScore.disclosure}</span>
              </dd>
            </div>
          ) : (
            <div>
              <dt>Conditional portfolio score</dt>
              <dd>Unavailable under current assessment or publication rules</dd>
            </div>
          )}
        </dl>
      </section>

      <section aria-labelledby={`compare-capabilities-${column.publicRef}`}>
        <h4 id={`compare-capabilities-${column.publicRef}`}>Capability results</h4>
        <ul className="il-compare-capability-list">
          {column.capabilities.map((capability) => (
            <li key={capability.capabilityName}>
              <strong>{capability.capabilityName}</strong>
              <span>
                {" "}
                — {capability.statusLabel}
                {capability.conditionalScore
                  ? ` · ${capability.conditionalScore.pointsAwarded}/${capability.conditionalScore.pointsPossible} · ${capability.conditionalScore.bandLabel}`
                  : ""}
              </span>
              <span className="il-muted">
                {" "}
                · Confidence {words(capability.confidence)} · Freshness{" "}
                {words(capability.freshness)} · Completeness{" "}
                {words(capability.assessmentCompleteness)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby={`compare-evidence-${column.publicRef}`}>
        <h4 id={`compare-evidence-${column.publicRef}`}>Evidence coverage</h4>
        <ul className="il-compare-evidence-list">
          {column.evidenceByCapability.map((row) => (
            <li key={row.capabilityName}>
              <strong>{row.capabilityName}</strong> — {row.publishedEvidenceCount} permitted linked
              evidence · {row.provenanceSummary}
              <span className="il-muted"> · {row.gapLabel}</span>
            </li>
          ))}
        </ul>
      </section>

      {column.gapIndicators.length > 0 ? (
        <section aria-labelledby={`compare-gaps-${column.publicRef}`}>
          <h4 id={`compare-gaps-${column.publicRef}`}>Gap indicators</h4>
          <ul>
            {column.gapIndicators.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby={`compare-overlay-${column.publicRef}`}>
        <h4 id={`compare-overlay-${column.publicRef}`}>Private overlay</h4>
        {column.overlay.access === "restricted" ? (
          <p className="il-muted">Overlay access is restricted for this workspace role.</p>
        ) : column.overlay.access === "omitted" ? (
          <p className="il-muted">{column.overlay.summary}</p>
        ) : (
          <dl className="il-compare-facts">
            <div>
              <dt>Relationship</dt>
              <dd>{column.overlay.relationshipStatusLabel}</dd>
            </div>
            <div>
              <dt>Match</dt>
              <dd>{column.overlay.matchStatusLabel}</dd>
            </div>
            <div>
              <dt>Review</dt>
              <dd>{column.overlay.reviewStatusLabel}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{column.overlay.sourceClassificationLabel}</dd>
            </div>
            {column.overlay.capabilityUsageLabels.length > 0 ? (
              <div>
                <dt>Capability usage</dt>
                <dd>
                  <ul>
                    {column.overlay.capabilityUsageLabels.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
          </dl>
        )}
      </section>

      {column.warnings.length > 0 ? (
        <ul className="il-warning-list">
          {column.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
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

  if (view.state === "malformed") {
    return (
      <div className="il-phase7-page">
        <PageHeader title="Compare" description="Side-by-side synthetic organization comparison." />
        <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
        <EmptyState
          title="Comparison selection is malformed"
          description={view.stateMessage}
          actionLabel="Start a new comparison"
          actionHref="/compare"
        />
      </div>
    );
  }

  if (view.state === "not_found") {
    return (
      <div className="il-phase7-page">
        <PageHeader title="Compare" description="Side-by-side synthetic organization comparison." />
        <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
        <EmptyState
          title="Organizations not found"
          description={view.stateMessage}
          actionLabel="Choose organizations"
          actionHref="/compare"
        />
        {view.candidates.length > 0 ? (
          <CompareSelectionForm
            key={view.selectedRefs.join("|") || "empty"}
            candidates={view.candidates}
            selectedRefs={view.selectedRefs}
          />
        ) : null}
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
          <StatusBadge tone="info">
            Synthetic · {view.manifest.minOrganizations}–{view.manifest.maxOrganizations} orgs
          </StatusBadge>
        }
      />
      <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
      <p className="il-research-disclaimer">{view.selectionGuidance}</p>

      <section className="il-compare-selection-panel" aria-labelledby="compare-selection-heading">
        <h2 id="compare-selection-heading" className="il-section-title">
          Selection
        </h2>
        {view.columns.length > 0 ? (
          <ul className="il-compare-selected-chips" aria-label="Currently selected organizations">
            {view.columns.map((column) => (
              <li key={column.publicRef}>
                <span>{column.displayName}</span>{" "}
                <Link href={column.removeHref}>Remove {column.displayName}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No organizations selected"
            description={view.selectionGuidance}
            actionLabel="Browse organizations"
            actionHref="/organizations"
          />
        )}
        {view.candidates.length > 0 ? (
          <CompareSelectionForm
            key={view.selectedRefs.join("|") || "empty"}
            candidates={view.candidates}
            selectedRefs={view.selectedRefs}
            maxOrganizations={view.manifest.maxOrganizations}
            minOrganizations={view.manifest.minOrganizations}
          />
        ) : null}
      </section>

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
        <>
          <DifferenceLegend />
          <section className="il-compare-matrix" aria-labelledby="compare-matrix-heading">
            <h2 id="compare-matrix-heading" className="il-section-title">
              Side-by-side comparison
            </h2>
            <p className="il-research-disclaimer">
              Scores are reused from existing assessments. No ranking or investment recommendation
              is implied.
            </p>
            <div className="il-compare-columns" role="list">
              {view.columns.map((column) => (
                <div key={column.publicRef} role="listitem">
                  <OrganizationColumn column={column} />
                </div>
              ))}
            </div>
          </section>

          {view.differences.length > 0 ? (
            <section
              className="il-compare-differences"
              aria-labelledby="compare-differences-heading"
            >
              <h2 id="compare-differences-heading" className="il-section-title">
                Published differences
              </h2>
              <div className="il-compare-diff-list">
                {view.differences.map((row) => (
                  <article
                    key={row.dimensionKey}
                    className={`il-compare-diff-card il-compare-diff--${row.state}`}
                  >
                    <h3>
                      <span className="il-compare-diff-marker" aria-hidden="true">
                        {row.state === "same"
                          ? "="
                          : row.state === "different"
                            ? "≠"
                            : row.state === "unavailable"
                              ? "?"
                              : "∅"}
                      </span>{" "}
                      {row.dimensionLabel}
                    </h3>
                    <p>
                      <strong>{row.stateLabel}</strong>
                    </p>
                    <ul>
                      {row.cells.map((cell) => (
                        <li key={cell.publicRef}>
                          <span className="il-compare-diff-org">{cell.displayName}</span>:{" "}
                          {cell.valueLabel}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {view.contrastNotes.map((note) => (
            <p key={note} className="il-research-disclaimer">
              {note}
            </p>
          ))}
        </>
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
