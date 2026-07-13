import Link from "next/link";
import type { OrganizationDetailPageView } from "@/application/detail-view-models";
import { DetailLineage } from "@/components/detail/DetailLineage";
import { DataFreshness } from "@/components/status/DataFreshness";
import {
  EmptyState,
  ErrorState,
  RestrictedState,
  SyntheticNotice,
} from "@/components/status/States";
import { StatusBadge } from "@/components/status/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";

function words(value: string) {
  return value.replace(/_/g, " ");
}

export function OrganizationDetailPage({ view }: { view: OrganizationDetailPageView }) {
  if (view.state !== "ok") {
    return (
      <div className="il-phase6-page">
        <Link className="il-back-link" href="/organizations">
          ← Back to organizations
        </Link>
        <PageHeader
          title="Organization detail"
          description="Synthetic organization research record."
        />
        <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
        {view.state === "unauthorized" ? (
          <RestrictedState title="Organization detail restricted" description={view.stateMessage} />
        ) : view.state === "not_found" || view.state === "malformed" ? (
          <EmptyState
            title="Organization not found"
            description={view.stateMessage}
            actionLabel="Browse organizations"
            actionHref="/organizations"
          />
        ) : (
          <ErrorState title="Organization detail unavailable" description={view.stateMessage} />
        )}
      </div>
    );
  }

  const p = view.portfolioSummary;
  const organizationEvidenceHref = `/evidence?orgRef=${encodeURIComponent(
    view.header.detailHref.split("/").at(-1) ?? "",
  )}`;
  return (
    <div className="il-phase6-page">
      <Link className="il-back-link" href="/organizations">
        ← Back to organizations
      </Link>
      <PageHeader
        title={view.header.displayName}
        description={view.header.verticalSummary}
        meta={
          <div className="il-detail-statuses">
            <StatusBadge tone="info">Synthetic</StatusBadge>
            <StatusBadge>{words(view.header.organizationType)}</StatusBadge>
            <StatusBadge>{words(view.header.lifecycleStatus)}</StatusBadge>
            <span>{view.header.locationLabel}</span>
            <span>{p.statusLabel}</span>
          </div>
        }
      />
      <SyntheticNotice>{view.manifest.syntheticNotice}</SyntheticNotice>
      <div className="il-detail-declaration" role="note">
        <strong>Fictional organization and synthetic research record.</strong>
        <p>
          Evidence and provenance are synthetic. “Verified” means validated against synthetic
          provenance only. Scores are prioritization heuristics and do not predict purchases or
          outcomes. Human judgment required.
        </p>
      </div>
      <p className="il-research-disclaimer">{view.manifest.heuristicDisclaimer}</p>
      <p className="il-detail-actions">
        <Link href="/methodology">Inspect executable methodology</Link>
        <Link href={organizationEvidenceHref}>View this organization’s evidence catalog</Link>
        <Link href={view.header.compareHref} aria-label={view.header.compareActionLabel}>
          Compare
        </Link>
      </p>
      {view.header.warnings.length > 0 ? (
        <aside className="il-detail-warnings" aria-labelledby="detail-warnings-heading">
          <h2 id="detail-warnings-heading">Requires review</h2>
          <ul>
            {view.header.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </aside>
      ) : null}

      <nav className="il-section-nav" aria-label="Organization detail sections">
        <a href="#profile">Profile</a>
        <a href="#portfolio">Portfolio assessment</a>
        <a href="#capabilities">Capabilities</a>
        <a href="#evidence">Evidence</a>
        <a href="#lineage">Lineage</a>
        <a href="#signals">Signals</a>
        <a href="#gaps">Limitations</a>
        <a href="#overlay">Private context</a>
        <a href="#manifest">Manifest</a>
      </nav>

      <section id="profile" className="il-research-section" aria-labelledby="profile-heading">
        <h2 id="profile-heading">Organization profile</h2>
        <p>{view.profile.summary}</p>
        <p className="il-card-meta">
          Profile values are distinct from evidence status. Scoring contributions are shown only in
          the capability ledgers, where each awarded rule identifies supporting evidence.
        </p>
        <dl className="il-fact-grid">
          {view.profile.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
        <div className="il-tag-list" aria-label="Organization tags">
          {view.header.tags.map((tag) => (
            <StatusBadge key={tag}>{tag}</StatusBadge>
          ))}
        </div>
      </section>

      <section id="portfolio" className="il-research-section" aria-labelledby="portfolio-heading">
        <h2 id="portfolio-heading">Portfolio assessment</h2>
        <p>{p.disclaimer}</p>
        {p.conditionalScore ? (
          <div className="il-conditional-score">
            <strong>
              {p.conditionalScore.pointsAwarded}/{p.conditionalScore.pointsPossible}
            </strong>
            <span>{p.conditionalScore.bandLabel}</span>
            <p>{p.conditionalScore.disclosure}</p>
          </div>
        ) : (
          <>
            <p className="il-insufficient-label">
              No numeric score or observed-alignment band is shown.
            </p>
            <p>{p.insufficiencyExplanation}</p>
          </>
        )}
        <dl className="il-summary-grid">
          <div>
            <dt>Status</dt>
            <dd>{p.statusLabel}</dd>
          </div>
          <div>
            <dt>Capability coverage</dt>
            <dd>
              {p.coverage.assessedCapabilityCount} assessed of {p.coverage.enabledCapabilityCount}{" "}
              enabled
            </dd>
          </div>
          <div>
            <dt>Priority-weight coverage</dt>
            <dd>
              {p.coverage.assessedPriorityWeight} assessed of {p.coverage.enabledPriorityWeight}
            </dd>
          </div>
          <div>
            <dt>Confidence</dt>
            <dd>{words(p.confidence)}</dd>
          </div>
          <div>
            <dt>Freshness</dt>
            <dd>
              <DataFreshness state={p.freshness} />
            </dd>
          </div>
          <div>
            <dt>Completeness</dt>
            <dd>{words(p.assessmentCompleteness)}</dd>
          </div>
          <div>
            <dt>Publication</dt>
            <dd>{words(p.publicationEligibility)}</dd>
          </div>
          <div>
            <dt>Opportunity context</dt>
            <dd>{p.opportunityContextLabel}</dd>
          </div>
          <div>
            <dt>Insufficient capabilities</dt>
            <dd>{p.coverage.insufficientCapabilityCount}</dd>
          </div>
          <div>
            <dt>Best observed capability</dt>
            <dd>{p.bestObservedCapability}</dd>
          </div>
          <div>
            <dt>Methodology version</dt>
            <dd>{p.methodologyVersion}</dd>
          </div>
          <div>
            <dt>Assessed timestamp</dt>
            <dd>{p.assessedAt}</dd>
          </div>
        </dl>
        <p className="il-research-disclaimer">
          Synthetic opportunity context is separate from observed alignment and does not alter
          assessment points. Human judgment is required.
        </p>
      </section>

      <section
        id="capabilities"
        className="il-research-section"
        aria-labelledby="capabilities-heading"
      >
        <h2 id="capabilities-heading">Capability assessments and complete ledgers</h2>
        <nav className="il-section-nav" aria-label="Capability anchors">
          {view.capabilities.map((capability) => (
            <a key={capability.capabilityName} href={`#${capability.anchorId}`}>
              {capability.capabilityName}
            </a>
          ))}
        </nav>
        <div className="il-detail-capabilities">
          {view.capabilities.map((capability) => (
            <article
              id={capability.anchorId}
              className="il-capability-section"
              key={capability.capabilityName}
            >
              <h3>{capability.capabilityName}</h3>
              <p>{capability.description}</p>
              <p className="il-card-meta">
                {capability.categoryLabel} · portfolio priority {capability.priority} ·{" "}
                {capability.statusLabel} · confidence {words(capability.confidence)} · freshness{" "}
                {words(capability.freshness)} · {capability.opportunityContextLabel}
              </p>
              {capability.pointsAwarded !== undefined && capability.pointsPossible !== undefined ? (
                <p>
                  Conditional capability score: {capability.pointsAwarded}/
                  {capability.pointsPossible} · {capability.bandLabel}
                </p>
              ) : (
                <p className="il-insufficient-label">No numeric capability score is available.</p>
              )}
              <dl className="il-summary-grid">
                <div>
                  <dt>Assessment completeness</dt>
                  <dd>{words(capability.assessmentCompleteness)}</dd>
                </div>
                <div>
                  <dt>Publication eligibility</dt>
                  <dd>{words(capability.publicationEligibility)}</dd>
                </div>
                <div>
                  <dt>Required-evidence gate</dt>
                  <dd>{capability.requiredEvidenceGateStatus}</dd>
                </div>
              </dl>
              <h4>Factor-category contributions</h4>
              <ul className="il-factor-contributions">
                {capability.factorContributions.map((factor) => (
                  <li key={factor.factorCategoryLabel}>
                    {factor.factorCategoryLabel}: {factor.awardedPoints}/{factor.maximumPoints}
                  </li>
                ))}
              </ul>
              <div
                className="il-local-table-scroll"
                role="region"
                aria-label={`${capability.capabilityName} complete rule ledger`}
                tabIndex={0}
              >
                <table className="il-ledger-table">
                  <caption>
                    Complete rule ledger for {capability.capabilityName};{" "}
                    {capability.ledgerRows.length} rows
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Rule</th>
                      <th scope="col">Factor</th>
                      <th scope="col">Outcome</th>
                      <th scope="col">Points</th>
                      <th scope="col">Reason</th>
                      <th scope="col">Evidence lineage</th>
                      <th scope="col">Constraints</th>
                    </tr>
                  </thead>
                  <tbody>
                    {capability.ledgerRows.map((row, rowIndex) => (
                      <tr key={`${row.ruleTitle}-${rowIndex}`}>
                        <th scope="row">{row.ruleTitle}</th>
                        <td>{row.factorCategoryLabel}</td>
                        <td>{row.outcomeLabel}</td>
                        <td>
                          {row.pointsAwarded}/{row.maximumPoints}
                        </td>
                        <td>{row.reason}</td>
                        <td>
                          {row.lineage.length > 0 ? (
                            <ul className="il-compact-list">
                              {row.lineage.map((line) => (
                                <li key={line}>{line}</li>
                              ))}
                            </ul>
                          ) : (
                            "No cited evidence"
                          )}
                        </td>
                        <td>
                          {row.requirementLabel}; version {row.ruleVersion};{" "}
                          {words(row.publicationEligibility)}; {row.freshnessSummary};{" "}
                          {row.epistemicSummary}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="il-capability-limitations">
                <h4>Evidence gaps and limitations</h4>
                <p>{capability.evidenceGapSummary}</p>
                <ul>
                  {capability.limitations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="evidence" className="il-research-section" aria-labelledby="evidence-heading">
        <h2 id="evidence-heading">Evidence and provenance</h2>
        {view.evidence.state === "restricted" ? (
          <RestrictedState description={view.evidence.message} />
        ) : view.evidence.cards.length === 0 ? (
          <EmptyState
            title="No evidence"
            description="No publication-safe evidence is available for this record."
          />
        ) : (
          <div className="il-card-grid">
            {view.evidence.cards.map((card, index) => (
              <article className="il-evidence-card" key={`${card.title}-${index}`}>
                <h3>{card.title}</h3>
                <p className="il-card-meta">
                  {card.evidenceTypeLabel} · {words(card.freshness)} · {words(card.confidence)} ·{" "}
                  {words(card.publicationEligibility)}
                </p>
                {card.state === "available" ? (
                  <>
                    <p>{card.summary}</p>
                    <p className="il-card-meta">
                      Observed {card.observedAtLabel} · effective {card.effectivePeriodLabel}
                    </p>
                    {card.observationLabel ? <p>Observation: {card.observationLabel}</p> : null}
                    <p>Source: {card.provenanceSourceName ?? "Not provided"}</p>
                    {card.calculatedInputDescription ? (
                      <p>Calculated evidence: {card.calculatedInputDescription}</p>
                    ) : null}
                    {card.ruleBasedMethodologyLabel ? (
                      <p>Rule-based evidence: {card.ruleBasedMethodologyLabel}</p>
                    ) : null}
                    <p>
                      Rules supported:{" "}
                      {card.supportedRuleTitles.length > 0
                        ? card.supportedRuleTitles.join("; ")
                        : "No awarded rule mapping"}
                    </p>
                    <p>
                      Capabilities affected:{" "}
                      {card.affectedCapabilities.length > 0
                        ? card.affectedCapabilities.join("; ")
                        : "No capability mapping"}
                    </p>
                  </>
                ) : (
                  <p>Details are withheld for this workspace role.</p>
                )}
              </article>
            ))}
          </div>
        )}
        <h3>Provenance records ({view.provenance.total})</h3>
        <div className="il-card-grid">
          {view.provenance.cards.map((card, index) => (
            <article className="il-provenance-card" key={`${card.sourceName}-${index}`}>
              <h4>{card.sourceName}</h4>
              <p>{card.sourceTypeLabel}</p>
              <p className="il-card-meta">
                {card.validationStatus} · {card.licenseStatus} · {card.accessClassification}
              </p>
              <p>{card.checksumIndicator}</p>
              <p>{card.notes}</p>
              <p className="il-card-meta">
                Published {card.publishedAtLabel} · retrieved {card.retrievedAtLabel} · reporting{" "}
                {card.reportingPeriodLabel}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="lineage" className="il-research-section" aria-labelledby="lineage-heading">
        <h2 id="lineage-heading">Assessment lineage</h2>
        <DetailLineage view={view} />
        <div
          className="il-local-table-scroll"
          role="region"
          aria-label="Capability-level lineage summary"
          tabIndex={0}
        >
          <table className="il-ledger-table">
            <caption>Capability-level lineage summary</caption>
            <thead>
              <tr>
                <th scope="col">Capability</th>
                <th scope="col">Awarded rules</th>
                <th scope="col">Awarded points</th>
                <th scope="col">Explanation</th>
              </tr>
            </thead>
            <tbody>
              {view.lineage.rows.map((row) => (
                <tr key={row.capabilityName}>
                  <th scope="row">{row.capabilityName}</th>
                  <td>{row.awardedRuleCount}</td>
                  <td>{row.awardedPoints}</td>
                  <td>{row.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="signals" className="il-research-section" aria-labelledby="signals-heading">
        <h2 id="signals-heading">Signals to review</h2>
        <p>
          Showing {view.signals.rows.length} of {view.signals.total} synthetic signals; these are
          observations, not predictions.
        </p>
        <div className="il-card-grid">
          {view.signals.rows.map((signal, index) => (
            <article className="il-evidence-card" key={`${signal.title}-${index}`}>
              <h3>{signal.title}</h3>
              <p className="il-card-meta">
                Observed {signal.observedAtLabel} · effective {signal.effectivePeriodLabel} ·{" "}
                {words(signal.freshness)} · {signal.epistemicStatusLabel} ·{" "}
                {words(signal.publicationEligibility)}
              </p>
              <p>{signal.relevanceExplanation}</p>
              <p>
                Capabilities affected:{" "}
                {signal.affectedCapabilities.length > 0
                  ? signal.affectedCapabilities.join("; ")
                  : "No assessed capability mapping"}
              </p>
              <p>Source provenance: {signal.provenanceSummary}</p>
            </article>
          ))}
        </div>
        {view.signals.unknownDateRows.length > 0 ? (
          <>
            <h3>Unknown observation date</h3>
            <div className="il-card-grid">
              {view.signals.unknownDateRows.map((signal, index) => (
                <article className="il-evidence-card" key={`${signal.title}-unknown-${index}`}>
                  <h4>{signal.title}</h4>
                  <p>{signal.relevanceExplanation}</p>
                  <p className="il-card-meta">
                    Observation and effective dates are unknown · {words(signal.freshness)} ·{" "}
                    {signal.epistemicStatusLabel}
                  </p>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>

      <section id="gaps" className="il-research-section" aria-labelledby="gaps-heading">
        <h2 id="gaps-heading">Evidence gaps</h2>
        {view.gaps.rows.length === 0 ? (
          <p>No unresolved capability evidence gaps are recorded.</p>
        ) : (
          <ul>
            {view.gaps.rows.map((gap, index) => (
              <li key={`${gap.capabilityName}-${gap.reasonKind}-${index}`}>
                <strong>
                  {gap.capabilityName} · {gap.reasonKind}:
                </strong>{" "}
                {gap.reasonSummary} {gap.actionLabel}
                {gap.unresolvedPriorityWeight > 0
                  ? ` Unresolved priority weight ${gap.unresolvedPriorityWeight}.`
                  : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="overlay" className="il-research-section" aria-labelledby="overlay-heading">
        <h2 id="overlay-heading">Synthetic tenant-private overlay</h2>
        {view.overlay.state === "available" ? (
          <>
            <p className="il-card-meta">
              Relationship {view.overlay.relationshipStatusLabel} · match{" "}
              {view.overlay.matchStatusLabel} · review {view.overlay.reviewStatusLabel} · source{" "}
              {view.overlay.sourceClassificationLabel}
            </p>
            <p>
              Effective {view.overlay.effectiveAtLabel}; updated {view.overlay.updatedAtLabel}.
              Overlay context is internal-only and does not affect fit score or assessment points.
            </p>
            <ul>
              {view.overlay.capabilityUsage.map((item) => (
                <li key={item.capabilityName}>
                  {item.capabilityName}: {item.usageStatusLabel}
                </li>
              ))}
            </ul>
          </>
        ) : view.overlay.state === "restricted" ? (
          <RestrictedState description={view.overlay.message} />
        ) : (
          <p>{view.overlay.message}</p>
        )}
      </section>

      <section id="manifest" className="il-research-section" aria-labelledby="manifest-heading">
        <h2 id="manifest-heading">Assessment manifest</h2>
        <dl className="il-manifest-grid">
          <div>
            <dt>Vertical</dt>
            <dd>{view.manifest.verticalLabel}</dd>
          </div>
          <div>
            <dt>Engine version</dt>
            <dd>{view.manifest.engineVersion}</dd>
          </div>
          <div>
            <dt>Domain schema version</dt>
            <dd>{view.manifest.domainSchemaVersion}</dd>
          </div>
          <div>
            <dt>Adapter version</dt>
            <dd>{view.manifest.adapterVersion}</dd>
          </div>
          <div>
            <dt>Methodology version</dt>
            <dd>{view.manifest.methodologyVersion}</dd>
          </div>
          <div>
            <dt>Capability catalog version</dt>
            <dd>{view.manifest.capabilityCatalogVersion}</dd>
          </div>
          <div>
            <dt>Portfolio version</dt>
            <dd>{view.manifest.portfolioVersion}</dd>
          </div>
          <div>
            <dt>Dataset version</dt>
            <dd>{view.manifest.datasetVersion}</dd>
          </div>
          <div>
            <dt>Determinism verified</dt>
            <dd>{view.manifest.determinismVerified ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt>Superseded</dt>
            <dd>{view.manifest.superseded ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt>Assessed at</dt>
            <dd>{view.manifest.assessedAt}</dd>
          </div>
          <div>
            <dt>Fingerprint</dt>
            <dd className="il-fingerprint">
              {view.fingerprint.value} ({view.fingerprint.label})
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
