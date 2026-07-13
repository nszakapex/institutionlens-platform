import type { OverviewPageView } from "@/application/overview-view-models";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, SyntheticNotice } from "@/components/status/States";
import { AlignmentDistribution } from "@/components/overview/AlignmentDistribution";
import { PriorityShortlist } from "@/components/overview/PriorityShortlist";
import { EvidenceReviewQueue } from "@/components/overview/EvidenceReviewQueue";
import { AttentionQueue } from "@/components/overview/AttentionQueue";
import { CapabilityOpportunitySummary } from "@/components/overview/CapabilityOpportunitySummary";
import { ChangeSignalSummary } from "@/components/overview/ChangeSignalSummary";

type Props = {
  view: OverviewPageView;
};

export function OverviewPage({ view }: Props) {
  if (view.state === "unauthorized" || view.state === "error" || view.state === "unavailable") {
    return (
      <>
        <PageHeader
          title="InstitutionLens"
          description="Portfolio overview for synthetic financial-institution research."
        />
        <ErrorState
          title="Overview unavailable"
          description={view.stateMessage ?? "The portfolio overview could not be loaded."}
        />
      </>
    );
  }

  if (view.state === "empty_tenant") {
    return (
      <>
        <PageHeader
          title="InstitutionLens"
          description="Portfolio overview for synthetic financial-institution research."
        />
        <EmptyState
          title="No organizations in this workspace"
          description={view.stateMessage ?? "No synthetic organizations are available."}
        />
      </>
    );
  }

  const { universe } = view;

  return (
    <>
      <PageHeader
        title="InstitutionLens"
        description="Read-only portfolio overview for synthetic financial-institution research. Prioritization heuristics support human review; they are not deal forecasts."
        meta={
          <div className="il-research-meta">
            <span>{view.verticalLabel}</span>
            <span>Methodology {view.methodologyVersion}</span>
            <span>Dataset {view.datasetVersion}</span>
            <span>As assessed {view.asAssessedAt.slice(0, 10)}</span>
          </div>
        }
      />

      <SyntheticNotice label="Synthetic demo">{view.syntheticNotice}</SyntheticNotice>
      <p className="il-research-disclaimer">{view.heuristicDisclaimer}</p>

      <section aria-labelledby="universe-heading" className="il-stack-section">
        <SectionHeader
          eyebrow="Universe"
          title="Synthetic universe summary"
          description="Tenant-scoped totals derived from the current assessment manifest. Missing values are shown as unavailable, not zero."
        />
        <div className="il-universe-grid" id="universe-heading">
          <div className="il-universe-item">
            <span className="il-universe-label">Total organizations</span>
            <span className="il-universe-value">{universe.totalOrganizations}</span>
          </div>
          <div className="il-universe-item">
            <span className="il-universe-label">Portfolio assessed</span>
            <span className="il-universe-value">{universe.portfolioAssessed}</span>
          </div>
          <div className="il-universe-item">
            <span className="il-universe-label">Portfolio insufficient evidence</span>
            <span className="il-universe-value">{universe.portfolioInsufficientEvidence}</span>
          </div>
          <div className="il-universe-item">
            <span className="il-universe-label">Capability assessments</span>
            <span className="il-universe-value">{universe.capabilityAssessments}</span>
          </div>
          <div className="il-universe-item">
            <span className="il-universe-label">Capability assessed</span>
            <span className="il-universe-value">{universe.capabilityAssessed}</span>
          </div>
          <div className="il-universe-item">
            <span className="il-universe-label">Capability insufficient evidence</span>
            <span className="il-universe-value">{universe.capabilityInsufficientEvidence}</span>
          </div>
        </div>
        <p className="il-distribution-note">
          Synthetic demo only — these counts do not imply real market coverage.
        </p>
      </section>

      <section className="il-stack-section">
        <SectionHeader
          eyebrow="Distribution"
          title="Observed-alignment distribution"
          description="Assessed portfolio results only. Insufficient-evidence organizations are counted separately and are not placed in a zero-score band."
        />
        <AlignmentDistribution distribution={view.alignmentDistribution} />
      </section>

      <section className="il-stack-section">
        <SectionHeader
          eyebrow="Prioritization"
          title="Observed-alignment shortlist"
          description={view.shortlist.orderingExplanation}
        />
        <PriorityShortlist shortlist={view.shortlist} />
      </section>

      <section className="il-stack-section">
        <SectionHeader
          eyebrow="Evidence"
          title="Evidence review required"
          description={view.evidenceReview.explanation}
        />
        <EvidenceReviewQueue queue={view.evidenceReview} />
      </section>

      <section className="il-stack-section">
        <SectionHeader
          eyebrow="Attention"
          title="Attention / review queue"
          description={view.attention.explanation}
        />
        <AttentionQueue queue={view.attention} />
      </section>

      <section className="il-stack-section">
        <SectionHeader
          eyebrow="Opportunity context"
          title="Capability opportunity summary"
          description="Tenant-private synthetic overlay classifications. Opportunity context never alters fit. Unknown is not counted as new logo."
        />
        <CapabilityOpportunitySummary rows={view.capabilityOpportunities} />
      </section>

      <section className="il-stack-section">
        <SectionHeader
          eyebrow="Signals"
          title="Signals to review"
          description={view.changeSignals.explanation}
        />
        <ChangeSignalSummary signals={view.changeSignals} />
      </section>

      <p className="il-research-disclaimer">
        Freshness, confidence, assessment completeness, and publication eligibility remain separate
        from observed alignment. Insufficient evidence is never treated as limited alignment.
      </p>
    </>
  );
}
