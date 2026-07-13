import type { ObservedAlignmentDistributionView } from "@/application/overview-view-models";

type Props = {
  distribution: ObservedAlignmentDistributionView;
};

export function AlignmentDistribution({ distribution }: Props) {
  const max = Math.max(
    1,
    ...distribution.assessedBuckets.map((b) => b.count),
    distribution.insufficientEvidenceCount,
  );

  return (
    <div className="il-distribution">
      <div className="il-distribution-bars" role="img" aria-labelledby="alignment-chart-desc">
        {distribution.assessedBuckets.map((bucket, index) => {
          const width = Math.round((bucket.count / max) * 100);
          return (
            <div className="il-distribution-row" key={bucket.band}>
              <span className="il-distribution-label">{bucket.bandLabel}</span>
              <div className="il-distribution-track" aria-hidden="true">
                <div
                  className={
                    index === distribution.assessedBuckets.length - 1
                      ? "il-distribution-fill is-signal"
                      : "il-distribution-fill"
                  }
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="il-distribution-count">{bucket.count}</span>
            </div>
          );
        })}
        <div className="il-distribution-row">
          <span className="il-distribution-label">Insufficient evidence</span>
          <div className="il-distribution-track" aria-hidden="true">
            <div
              className="il-distribution-fill"
              style={{
                width: `${Math.round((distribution.insufficientEvidenceCount / max) * 100)}%`,
              }}
            />
          </div>
          <span className="il-distribution-count">{distribution.insufficientEvidenceCount}</span>
        </div>
      </div>
      <p id="alignment-chart-desc" className="sr-only">
        Observed-alignment distribution for {distribution.assessedTotal} assessed portfolio results.
        Insufficient evidence counted separately: {distribution.insufficientEvidenceCount}.
      </p>
      <div className="il-research-table-wrap">
        <table className="il-research-table">
          <caption className="sr-only">Observed-alignment band counts</caption>
          <thead>
            <tr>
              <th scope="col">Band</th>
              <th scope="col" className="is-numeric">
                Count
              </th>
            </tr>
          </thead>
          <tbody>
            {distribution.assessedBuckets.map((bucket) => (
              <tr key={bucket.band}>
                <td>{bucket.bandLabel}</td>
                <td className="is-numeric">{bucket.count}</td>
              </tr>
            ))}
            <tr>
              <td>Insufficient evidence (separate)</td>
              <td className="is-numeric">{distribution.insufficientEvidenceCount}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
