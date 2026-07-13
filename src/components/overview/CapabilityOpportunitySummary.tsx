import type { CapabilityOpportunityRowView } from "@/application/overview-view-models";

type Props = {
  rows: readonly CapabilityOpportunityRowView[];
};

const CONTEXT_ORDER = [
  "new_logo",
  "cross_sell",
  "existing_use",
  "renewal_or_reengagement",
  "unknown",
  "excluded",
] as const;

export function CapabilityOpportunitySummary({ rows }: Props) {
  return (
    <div className="il-capability-grid">
      {rows.map((row) => (
        <article className="il-capability-card" key={row.capabilityName}>
          <h3>{row.capabilityName}</h3>
          <p className="il-capability-meta">
            Portfolio priority {row.priority} · Assessed {row.assessedCount} · Insufficient evidence{" "}
            {row.insufficientCount}
          </p>
          <div className="il-research-table-wrap">
            <table className="il-research-table">
              <caption className="sr-only">
                Observed-alignment bands for {row.capabilityName}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Band</th>
                  <th scope="col" className="is-numeric">
                    Count
                  </th>
                </tr>
              </thead>
              <tbody>
                {row.bandDistribution.map((band) => (
                  <tr key={band.band}>
                    <td>{band.bandLabel}</td>
                    <td className="is-numeric">{band.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="il-capability-meta">Synthetic opportunity contexts (overlay-only)</p>
          <div className="il-opportunity-chips">
            {CONTEXT_ORDER.map((key) => (
              <span key={key}>
                {key.replace(/_/g, " ")}: {row.opportunityContexts[key]}
              </span>
            ))}
          </div>
          {row.freshnessWarnings.length > 0 ? (
            <ul className="il-warning-list">
              {row.freshnessWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </article>
      ))}
    </div>
  );
}
