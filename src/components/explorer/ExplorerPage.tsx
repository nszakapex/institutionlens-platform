import Link from "next/link";
import type { ExplorerPageView, ExplorerResultRowView } from "@/application/explorer-view-models";
import { EXPLORER_SORT_LABELS, type ExplorerSort } from "@/application/explorer-query";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, SyntheticNotice } from "@/components/status/States";
import { DataFreshness } from "@/components/status/DataFreshness";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { CheckboxFilterGroup } from "@/components/explorer/CheckboxFilterGroup";

type Props = {
  view: ExplorerPageView;
};

function ResultTable({
  rows,
  caption,
}: {
  rows: readonly ExplorerResultRowView[];
  caption: string;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="il-research-table-wrap il-desktop-only">
      <table className="il-research-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Organization</th>
            <th scope="col">Portfolio status</th>
            <th scope="col">Conditional score</th>
            <th scope="col">Observed alignment</th>
            <th scope="col">Capability / weight</th>
            <th scope="col">Confidence</th>
            <th scope="col">Freshness</th>
            <th scope="col">Opportunity context</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.displayName}>
              <td>
                <div className="il-org-name">
                  <Link href={row.detailHref}>{row.displayName}</Link>
                </div>
                <div>{row.organizationType}</div>
                <div className="il-score-disclosure">{row.verticalSummary}</div>
                {row.warnings.length > 0 ? (
                  <ul className="il-warning-list">
                    {row.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                ) : null}
              </td>
              <td>{row.portfolioAssessmentStatus}</td>
              <td>
                {row.conditionalScore ? (
                  <>
                    {row.conditionalScore.pointsAwarded}/{row.conditionalScore.pointsPossible}
                    <span className="il-score-disclosure">{row.conditionalScore.disclosure}</span>
                  </>
                ) : (
                  <span className="il-insufficient-label">Insufficient evidence</span>
                )}
              </td>
              <td>{row.bandLabel ?? "—"}</td>
              <td>
                Caps {row.assessedCapabilityCount ?? "—"}/{row.enabledCapabilityCount ?? "—"}
                <br />
                Weight {row.assessedPriorityWeight ?? "—"}/{row.enabledPriorityWeight ?? "—"}
              </td>
              <td>{row.confidence}</td>
              <td>
                {row.freshness === "unavailable" ? (
                  "unavailable"
                ) : (
                  <DataFreshness state={row.freshness} />
                )}
              </td>
              <td>{row.opportunityContextLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultStack({ rows }: { rows: readonly ExplorerResultRowView[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="il-result-stack" aria-label="Organization results">
      {rows.map((row) => (
        <article className="il-result-record" key={row.displayName}>
          <h3 className="il-result-record-title">
            <Link href={row.detailHref}>{row.displayName}</Link>
          </h3>
          <div className="il-result-record-meta">
            <span>{row.organizationType}</span>
            <span>{row.verticalSummary}</span>
            <span>{row.portfolioAssessmentStatus}</span>
            {row.conditionalScore ? (
              <span>
                Score {row.conditionalScore.pointsAwarded}/{row.conditionalScore.pointsPossible}
              </span>
            ) : (
              <span className="il-insufficient-label">Insufficient evidence</span>
            )}
            {row.bandLabel ? <span>{row.bandLabel}</span> : null}
            <span>Confidence {row.confidence}</span>
            <span>Freshness {row.freshness}</span>
            <span>{row.opportunityContextLabel}</span>
          </div>
          {row.conditionalScore ? (
            <span className="il-score-disclosure">{row.conditionalScore.disclosure}</span>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function ExplorerPage({ view }: Props) {
  if (view.state === "unauthorized" || view.state === "error" || view.state === "unavailable") {
    return (
      <>
        <PageHeader title="Organizations" description="Synthetic organization explorer." />
        <ErrorState
          title="Explorer unavailable"
          description={view.stateMessage ?? "The organization explorer could not be loaded."}
        />
      </>
    );
  }

  const f = view.formValues;

  return (
    <>
      <PageHeader
        title="Organizations"
        description="Search and filter the synthetic financial-institution universe. URL parameters are the canonical view state."
        meta={
          <div className="il-research-meta">
            <span>{view.verticalLabel}</span>
            <span>{view.resultCountAnnouncement}</span>
          </div>
        }
      />

      <SyntheticNotice label="Synthetic demo">{view.syntheticNotice}</SyntheticNotice>
      <p className="il-research-disclaimer">{view.heuristicDisclaimer}</p>

      {view.state === "malformed_query" ? (
        <div role="alert">
          <ErrorState
            title="Unsupported or invalid filters"
            description={view.errorSummary ?? view.stateMessage ?? "Adjust filters and try again."}
          />
          <p>
            <a href={view.clearAllHref}>Reset to defaults</a>
          </p>
        </div>
      ) : null}

      {view.unknownParams.length > 0 ? (
        <p className="il-distribution-note" role="status">
          Ignored unsupported parameters: {view.unknownParams.join(", ")}. They did not broaden
          results.
        </p>
      ) : null}

      <section aria-labelledby="filters-heading" className="il-explorer-layout">
        <h2 id="filters-heading" className="sr-only">
          Filters
        </h2>
        <form
          className="il-explorer-filters"
          method="get"
          action="/organizations"
          key={[
            f.text,
            f.organizationType.join(","),
            f.assessmentStatus.join(","),
            f.observedAlignmentBand.join(","),
            f.confidence.join(","),
            f.freshness.join(","),
            f.opportunityContext.join(","),
            f.institutionKind.join(","),
            f.scaleBand.join(","),
            f.sort,
            f.pageSize,
            f.exclusionPolicy,
            view.totalCount,
            view.page,
          ].join("|")}
        >
          <details open>
            <summary>Search, sort, and page size</summary>
            <div className="il-filter-grid">
              <TextInput
                label="Search"
                id="explorer-q"
                name="q"
                defaultValue={f.text}
                maxLength={100}
                placeholder="Display name, type, tags…"
              />
              <Select
                label="Excluded organizations"
                id="exclusionPolicy"
                name="exclusionPolicy"
                defaultValue={f.exclusionPolicy}
              >
                <option value="hide_excluded">Hide excluded (default)</option>
                <option value="include_excluded">Include excluded</option>
              </Select>
              <Select label="Sort" id="sort" name="sort" defaultValue={f.sort}>
                {(Object.keys(EXPLORER_SORT_LABELS) as ExplorerSort[]).map((key) => (
                  <option key={key} value={key}>
                    {EXPLORER_SORT_LABELS[key]}
                  </option>
                ))}
              </Select>
              <Select
                label="Page size"
                id="pageSize"
                name="pageSize"
                defaultValue={String(f.pageSize)}
              >
                <option value="12">12</option>
                <option value="24">24</option>
                <option value="48">48</option>
              </Select>
            </div>
          </details>

          <div className="il-filter-sections">
            <details open>
              <summary>Assessment filters</summary>
              <div className="il-filter-checkbox-grid">
                <CheckboxFilterGroup
                  legend="Organization type"
                  name="organizationType"
                  options={view.facets.organizationTypes}
                  selected={f.organizationType}
                />
                <CheckboxFilterGroup
                  legend="Assessment status"
                  name="assessmentStatus"
                  options={view.facets.assessmentStatuses}
                  selected={f.assessmentStatus}
                />
                <CheckboxFilterGroup
                  legend="Observed alignment"
                  name="observedAlignmentBand"
                  options={view.facets.observedAlignmentBands}
                  selected={f.observedAlignmentBand}
                />
                <CheckboxFilterGroup
                  legend="Confidence"
                  name="confidence"
                  options={view.facets.confidenceLevels}
                  selected={f.confidence}
                />
                <CheckboxFilterGroup
                  legend="Freshness"
                  name="freshness"
                  options={view.facets.freshnessStatuses}
                  selected={f.freshness}
                />
                <CheckboxFilterGroup
                  legend="Assessment completeness"
                  name="assessmentCompleteness"
                  options={view.facets.assessmentCompleteness}
                  selected={f.assessmentCompleteness}
                />
                <CheckboxFilterGroup
                  legend="Publication eligibility"
                  name="publicationEligibility"
                  options={view.facets.publicationEligibility}
                  selected={f.publicationEligibility}
                />
                <CheckboxFilterGroup
                  legend="Synthetic opportunity context"
                  name="opportunityContext"
                  options={view.facets.opportunityContexts}
                  selected={f.opportunityContext}
                />
                <CheckboxFilterGroup
                  legend="Capability"
                  name="capabilityId"
                  options={view.facets.capabilities}
                  selected={f.capabilityId}
                />
                <CheckboxFilterGroup
                  legend="Capability-assessment status"
                  name="capabilityAssessmentStatus"
                  options={view.facets.assessmentStatuses}
                  selected={f.capabilityAssessmentStatus}
                />
              </div>
            </details>

            <details>
              <summary>Financial-institution filters</summary>
              <div className="il-filter-checkbox-grid">
                <CheckboxFilterGroup
                  legend="Institution kind"
                  name="institutionKind"
                  options={view.facets.verticalFilters.institutionKind?.options ?? []}
                  selected={f.institutionKind}
                />
                <CheckboxFilterGroup
                  legend="Scale band"
                  name="scaleBand"
                  options={view.facets.verticalFilters.scaleBand?.options ?? []}
                  selected={f.scaleBand}
                />
                <CheckboxFilterGroup
                  legend="Operating region"
                  name="operatingRegion"
                  options={view.facets.verticalFilters.operatingRegion?.options ?? []}
                  selected={f.operatingRegion}
                />
                <CheckboxFilterGroup
                  legend="Data availability"
                  name="dataAvailability"
                  options={view.facets.verticalFilters.dataAvailability?.options ?? []}
                  selected={f.dataAvailability}
                />
                <CheckboxFilterGroup
                  legend="Service-area type"
                  name="serviceAreaType"
                  options={view.facets.verticalFilters.serviceAreaType?.options ?? []}
                  selected={f.serviceAreaType}
                />
                <CheckboxFilterGroup
                  legend="Ownership model"
                  name="ownershipModel"
                  options={view.facets.verticalFilters.ownershipModel?.options ?? []}
                  selected={f.ownershipModel}
                />
                <CheckboxFilterGroup
                  legend="Operating complexity"
                  name="operatingComplexityBand"
                  options={view.facets.verticalFilters.operatingComplexityBand?.options ?? []}
                  selected={f.operatingComplexityBand}
                />
                <CheckboxFilterGroup
                  legend="Digital-service maturity"
                  name="digitalServiceMaturity"
                  options={view.facets.verticalFilters.digitalServiceMaturity?.options ?? []}
                  selected={f.digitalServiceMaturity}
                />
                <CheckboxFilterGroup
                  legend="Lending breadth"
                  name="lendingBreadth"
                  options={view.facets.verticalFilters.lendingBreadth?.options ?? []}
                  selected={f.lendingBreadth}
                />
              </div>
            </details>
          </div>

          <div className="il-filter-actions">
            <Button type="submit" variant="primary">
              Apply filters
            </Button>
          </div>
        </form>

        <p className="il-filter-actions">
          <a className="il-button il-button--secondary il-button--md" href={view.clearAllHref}>
            Clear all
          </a>
        </p>

        <div className="il-active-filters" aria-label="Active filters">
          {view.activeFilters.map((chip) => (
            <a key={chip.key} className="il-filter-chip" href={chip.removeHref}>
              {chip.label}
              <span aria-hidden="true">×</span>
              <span className="sr-only">Remove filter</span>
            </a>
          ))}
        </div>

        <div className="il-explorer-toolbar">
          <p role="status">{view.resultCountAnnouncement}</p>
          <p>{view.sortExplanation}</p>
        </div>

        {view.state === "empty_tenant" ? (
          <EmptyState
            title="No organizations in this workspace"
            description={view.stateMessage ?? "No synthetic organizations are available."}
          />
        ) : null}

        {view.state === "no_results" || view.state === "no_search_results" ? (
          <div className="il-state il-state--empty" role="status">
            <h3 className="il-state-title">No matching organizations</h3>
            <p className="il-state-body">{view.stateMessage ?? "Try clearing filters."}</p>
            <a className="il-button il-button--secondary il-button--md" href={view.clearAllHref}>
              Clear all filters
            </a>
          </div>
        ) : null}

        {view.state === "beyond_range" ? (
          <div className="il-state il-state--empty" role="status">
            <h3 className="il-state-title">Page out of range</h3>
            <p className="il-state-body">
              {view.stateMessage ?? "This page does not exist for the current filters."}
            </p>
            <a
              className="il-button il-button--secondary il-button--md"
              href={view.pagination.recoveryHref ?? view.clearAllHref}
            >
              Go to last page
            </a>
          </div>
        ) : null}

        {view.state === "ready" ? (
          <>
            <SectionHeader
              eyebrow="Results"
              title="Organization results"
              description="Assessed scores are conditional on assessed capability coverage. Insufficient evidence never receives a numeric score."
            />
            {view.useAssessedInsufficientSplit ? (
              <>
                <ResultTable rows={view.assessedSection} caption="Assessed organizations" />
                <ResultStack rows={view.assessedSection} />
                {view.insufficientSection.length > 0 ? (
                  <>
                    <p className="il-section-divider">Insufficient evidence (not scored as zero)</p>
                    <ResultTable
                      rows={view.insufficientSection}
                      caption="Organizations with insufficient evidence"
                    />
                    <ResultStack rows={view.insufficientSection} />
                  </>
                ) : null}
              </>
            ) : (
              <>
                <ResultTable rows={view.combinedRows} caption="Organization explorer results" />
                <ResultStack rows={view.combinedRows} />
              </>
            )}
          </>
        ) : null}

        {view.pagination.pageHrefs.length > 0 ? (
          <nav className="il-pagination" aria-label="Pagination">
            {view.pagination.previousHref ? (
              <a href={view.pagination.previousHref}>Previous</a>
            ) : (
              <span aria-disabled="true">Previous</span>
            )}
            {view.pagination.pageHrefs.map((item) => (
              <a key={item.page} href={item.href} aria-current={item.current ? "page" : undefined}>
                {item.page}
              </a>
            ))}
            {view.pagination.nextHref ? (
              <a href={view.pagination.nextHref}>Next</a>
            ) : (
              <span aria-disabled="true">Next</span>
            )}
          </nav>
        ) : null}
      </section>
    </>
  );
}
