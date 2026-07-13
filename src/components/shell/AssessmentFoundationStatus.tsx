import type { AssessmentFoundationView } from "@/application/assessment-view-models";
import { StatusBadge } from "@/components/status/StatusBadge";
import { SyntheticNotice } from "@/components/status/States";
import { SectionHeader } from "@/components/ui/PageHeader";

type Props = {
  view: AssessmentFoundationView;
};

/**
 * Server-rendered assessment foundation status — heuristic preview, not a ranking UI.
 */
export function AssessmentFoundationStatus({ view }: Props) {
  return (
    <section className="il-preview-section" aria-labelledby="assessment-foundation-title">
      <SectionHeader
        eyebrow="Assessment engine"
        title="Synthetic prioritization heuristics"
        description="Phase 4 evaluates synthetic organizations against a tenant capability portfolio with a full rule-reason ledger. Fit, confidence, freshness, assessment completeness, publication eligibility, and opportunity context stay separate."
      />

      <SyntheticNotice label="Synthetic dataset">{view.syntheticDeclaration}</SyntheticNotice>

      <SyntheticNotice label="Heuristic disclaimer">{view.heuristicDisclaimer}</SyntheticNotice>

      <div className="il-assessment-status">
        <div className="il-assessment-status-row">
          <StatusBadge tone="info">Phase 4 · Assessment engine</StatusBadge>
          <StatusBadge tone="info">Engine v{view.engineVersion}</StatusBadge>
          <StatusBadge tone="neutral">Methodology v{view.methodologyVersion}</StatusBadge>
          <StatusBadge tone="neutral">Prioritization heuristic</StatusBadge>
        </div>

        <dl className="il-assessment-status-grid">
          <div>
            <dt>Methodology</dt>
            <dd>{view.methodologyLabel}</dd>
          </div>
          <div>
            <dt>Organizations assessed</dt>
            <dd>{view.organizationCount}</dd>
          </div>
          <div>
            <dt>Assessed capability runs</dt>
            <dd>{view.assessedCapabilityCount}</dd>
          </div>
          <div>
            <dt>Insufficient evidence</dt>
            <dd>{view.insufficientEvidenceCount}</dd>
          </div>
        </dl>

        <p className="il-assessment-status-note">{view.dimensionsNote}</p>

        <p className="il-assessment-status-note">
          Sample capability assessments below use display names only. Scores are observed-alignment
          prioritization heuristics. No explorer, ranking, briefs, or exports in this phase.
        </p>

        {view.samplePortfolioAssessments.length > 0 ? (
          <>
            <p className="il-assessment-status-note">
              Sample portfolio scores are conditional on assessed capabilities. Insufficient
              capabilities remain visible and are not treated as negative fit.
            </p>
            <ul className="il-assessment-sample-list" aria-label="Portfolio assessment samples">
              {view.samplePortfolioAssessments.map((sample) => (
                <li key={`${sample.orgDisplayName}-portfolio`}>
                  <strong>
                    {sample.orgDisplayName} · {sample.portfolioName}
                  </strong>
                  <span>
                    {sample.statusLabel}
                    {sample.pointsAwarded !== undefined && sample.pointsPossible !== undefined
                      ? ` · ${sample.pointsAwarded}/${sample.pointsPossible}`
                      : ""}
                    {sample.bandLabel ? ` · ${sample.bandLabel}` : ""}
                    {" · "}
                    confidence {sample.confidence} · freshness {sample.freshness} · assessment
                    completeness {sample.assessmentCompleteness} · publication{" "}
                    {sample.publicationEligibility}
                  </span>
                  <span>{sample.coverage.conditionalScoreDisclosure}</span>
                  <span>
                    Insufficient capabilities remaining visible ·{" "}
                    {sample.coverage.insufficientCapabilityCount}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <ul className="il-assessment-sample-list">
          {view.sampleAssessments.map((sample) => (
            <li key={`${sample.orgDisplayName}-${sample.capabilityName}`}>
              <strong>
                {sample.orgDisplayName} · {sample.capabilityName}
              </strong>
              <span>
                {sample.fitStatus}
                {sample.pointsAwarded !== undefined && sample.pointsPossible !== undefined
                  ? ` · ${sample.pointsAwarded}/${sample.pointsPossible}`
                  : ""}
                {sample.bandLabel ? ` · ${sample.bandLabel}` : ""}
                {" · "}
                confidence {sample.confidence} · freshness {sample.freshness} · assessment
                completeness {sample.assessmentCompleteness} · publication{" "}
                {sample.publicationEligibility}
              </span>
              <span>Synthetic opportunity context · {sample.opportunityReasonLabel}</span>
              {sample.ledgerPreview.length > 0 ? (
                <ul className="il-assessment-ledger-preview" aria-label="Rule ledger preview">
                  {sample.ledgerPreview.map((row) => (
                    <li key={`${row.title}-${row.outcomeLabel}`}>
                      <span className="il-assessment-ledger-title">{row.title}</span>
                      <span className="il-assessment-ledger-meta">
                        {row.outcomeLabel} · {row.pointsAwarded}/{row.maximumPoints}
                      </span>
                      <span className="il-assessment-ledger-reason">{row.reason}</span>
                      <span className="il-assessment-ledger-source">{row.sourceExplanation}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
