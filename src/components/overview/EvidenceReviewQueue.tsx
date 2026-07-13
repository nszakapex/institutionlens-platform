import Link from "next/link";
import type { OverviewPageView } from "@/application/overview-view-models";

type Props = {
  queue: OverviewPageView["evidenceReview"];
};

export function EvidenceReviewQueue({ queue }: Props) {
  if (queue.rows.length === 0) {
    return (
      <p className="il-distribution-note">
        No portfolio assessments currently require evidence review.
      </p>
    );
  }

  return (
    <>
      <p className="il-distribution-note">
        Showing {queue.rows.length} of {queue.total} organizations requiring evidence review
        (maximum {queue.maxRows}). These are not low-fit rankings.
      </p>
      <div className="il-queue-list">
        {queue.rows.map((row) => (
          <article className="il-queue-item" key={row.displayName}>
            <div className="il-queue-item-head">
              <Link className="il-queue-org" href={row.detailHref}>
                {row.displayName}
              </Link>
              <span className="il-queue-meta">{row.organizationType}</span>
              <span className="il-insufficient-label">Insufficient evidence</span>
            </div>
            <p className="il-result-record-meta">
              <span>Unresolved priority weight {row.unresolvedPriorityWeight}</span>
              <span>Insufficient capabilities {row.insufficientCapabilityCount}</span>
            </p>
            <p>{row.reasonSummary}</p>
          </article>
        ))}
      </div>
    </>
  );
}
