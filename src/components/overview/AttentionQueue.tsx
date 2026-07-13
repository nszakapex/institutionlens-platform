import Link from "next/link";
import type { OverviewPageView } from "@/application/overview-view-models";

type Props = {
  queue: OverviewPageView["attention"];
};

export function AttentionQueue({ queue }: Props) {
  if (queue.items.length === 0) {
    return (
      <p className="il-distribution-note">No attention items in the current synthetic queue.</p>
    );
  }

  return (
    <>
      <p className="il-distribution-note">
        Showing {queue.items.length} of {queue.total} attention items (maximum {queue.maxRows}).
        Policy {queue.policyVersion}. Not a live feed.
      </p>
      <div className="il-queue-list">
        {queue.items.map((item) => (
          <article
            className="il-queue-item"
            key={`${item.organizationLabel}-${item.reasonCode}-${item.capabilityLabel ?? ""}`}
          >
            <div className="il-queue-item-head">
              <Link className="il-queue-org" href={item.detailHref}>
                {item.organizationLabel}
              </Link>
              <span className={`il-severity il-severity--${item.severity}`}>
                {item.severity} · {item.category}
              </span>
              <span className="il-queue-meta">{item.reasonCode.replace(/_/g, " ")}</span>
            </div>
            <p>{item.humanReason}</p>
            <p className="il-result-record-meta">
              {item.capabilityLabel ? <span>Capability: {item.capabilityLabel}</span> : null}
              <span>Freshness: {item.freshness}</span>
              <span>{item.actionLabel}</span>
              <span>Synthetic</span>
            </p>
          </article>
        ))}
      </div>
    </>
  );
}
