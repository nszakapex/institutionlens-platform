import Link from "next/link";
import type { OverviewPageView } from "@/application/overview-view-models";
import { StatusBadge } from "@/components/status/StatusBadge";
import { DataFreshness } from "@/components/status/DataFreshness";

type Props = {
  shortlist: OverviewPageView["shortlist"];
};

export function PriorityShortlist({ shortlist }: Props) {
  if (shortlist.rows.length === 0) {
    return (
      <p className="il-distribution-note">
        No assessed organizations currently qualify for the shortlist.
      </p>
    );
  }

  return (
    <>
      <p className="il-distribution-note">
        Showing {shortlist.rows.length} of {shortlist.totalEligible} eligible assessed organizations
        (maximum {shortlist.maxRows}).
      </p>
      <div className="il-research-table-wrap il-desktop-only">
        <table className="il-research-table">
          <caption className="sr-only">Observed-alignment shortlist</caption>
          <thead>
            <tr>
              <th scope="col">Organization</th>
              <th scope="col">Conditional portfolio score</th>
              <th scope="col">Observed alignment</th>
              <th scope="col" className="is-numeric">
                Capabilities
              </th>
              <th scope="col" className="is-numeric">
                Priority weight
              </th>
              <th scope="col">Confidence</th>
              <th scope="col">Freshness</th>
              <th scope="col">Publication</th>
              <th scope="col">Opportunity context</th>
            </tr>
          </thead>
          <tbody>
            {shortlist.rows.map((row) => (
              <tr key={row.displayName}>
                <td>
                  <div className="il-org-name">
                    <Link href={row.detailHref}>{row.displayName}</Link>
                  </div>
                  <div>{row.organizationType}</div>
                  <p className="il-inbound-compare">
                    <Link href={row.compareHref} aria-label={row.compareActionLabel}>
                      Compare
                    </Link>
                    {row.briefHref && row.briefActionLabel ? (
                      <>
                        {" · "}
                        <Link
                          className="il-inbound-brief"
                          href={row.briefHref}
                          aria-label={row.briefActionLabel}
                        >
                          Brief
                        </Link>
                      </>
                    ) : null}
                  </p>
                  {row.warnings.length > 0 ? (
                    <ul className="il-warning-list">
                      {row.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  ) : null}
                </td>
                <td>
                  {row.conditionalScore.pointsAwarded}/{row.conditionalScore.pointsPossible}
                  <span className="il-score-disclosure">{row.conditionalScore.disclosure}</span>
                </td>
                <td>{row.bandLabel}</td>
                <td className="is-numeric">
                  {row.assessedCapabilityCount}/{row.enabledCapabilityCount}
                </td>
                <td className="is-numeric">
                  {row.assessedPriorityWeight}/{row.enabledPriorityWeight}
                </td>
                <td>{row.confidence}</td>
                <td>
                  <DataFreshness state={row.freshness} />
                </td>
                <td>
                  <StatusBadge tone="neutral">
                    {row.publicationEligibility.replace(/_/g, " ")}
                  </StatusBadge>
                </td>
                <td>{row.opportunityContextLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="il-result-stack" aria-label="Shortlist records">
        {shortlist.rows.map((row) => (
          <article className="il-result-record" key={row.displayName}>
            <h3 className="il-result-record-title">
              <Link href={row.detailHref}>{row.displayName}</Link>
            </h3>
            <p className="il-inbound-compare">
              <Link href={row.compareHref} aria-label={row.compareActionLabel}>
                Compare
              </Link>
              {row.briefHref && row.briefActionLabel ? (
                <>
                  {" · "}
                  <Link
                    className="il-inbound-brief"
                    href={row.briefHref}
                    aria-label={row.briefActionLabel}
                  >
                    Brief
                  </Link>
                </>
              ) : null}
            </p>
            <div className="il-result-record-meta">
              <span>{row.organizationType}</span>
              <span>
                Score {row.conditionalScore.pointsAwarded}/{row.conditionalScore.pointsPossible}
              </span>
              <span>{row.bandLabel}</span>
              <span>
                Capabilities {row.assessedCapabilityCount}/{row.enabledCapabilityCount}
              </span>
              <span>Confidence {row.confidence}</span>
              <span>Freshness {row.freshness}</span>
              <span>{row.opportunityContextLabel}</span>
            </div>
            <span className="il-score-disclosure">{row.conditionalScore.disclosure}</span>
            {row.warnings.length > 0 ? (
              <ul className="il-warning-list">
                {row.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </>
  );
}
