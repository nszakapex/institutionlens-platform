import type { OverviewPageView } from "@/application/overview-view-models";
import { DataFreshness } from "@/components/status/DataFreshness";
import { StatusBadge } from "@/components/status/StatusBadge";

type Props = {
  signals: OverviewPageView["changeSignals"];
};

export function ChangeSignalSummary({ signals }: Props) {
  if (signals.rows.length === 0) {
    return <p className="il-distribution-note">No publication-safe change signals to review.</p>;
  }

  return (
    <>
      <p className="il-distribution-note">
        Showing {signals.rows.length} of {signals.total} publication-safe synthetic signals (maximum{" "}
        {signals.maxRows}).
      </p>
      <div className="il-queue-list">
        {signals.rows.map((row) => (
          <article
            className="il-queue-item"
            key={`${row.organizationName}-${row.changeLabel}-${row.effectivePeriodLabel}`}
          >
            <div className="il-queue-item-head">
              <span className="il-queue-org">{row.organizationName}</span>
              <DataFreshness state={row.freshness} />
              <StatusBadge tone="neutral">{row.publicationState.replace(/_/g, " ")}</StatusBadge>
            </div>
            <p>{row.changeLabel}</p>
            <p className="il-result-record-meta">
              <span>Effective {row.effectivePeriodLabel}</span>
              <span>Epistemic: {row.epistemicLabel}</span>
              <span>Synthetic</span>
            </p>
          </article>
        ))}
      </div>
    </>
  );
}
