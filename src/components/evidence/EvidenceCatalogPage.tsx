import Link from "next/link";
import type {
  EvidenceCatalogPageView,
  EvidenceCatalogRowView,
  ProvenanceCatalogRowView,
} from "@/application/evidence-catalog-view-models";
import { CheckboxFilterGroup } from "@/components/explorer/CheckboxFilterGroup";
import {
  EmptyState,
  ErrorState,
  RestrictedState,
  SyntheticNotice,
} from "@/components/status/States";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";

const FILTERS = {
  evidenceType: [
    { value: "organization_profile", label: "Organization profile" },
    { value: "capability_signal", label: "Capability signal" },
    { value: "public_change_signal", label: "Public change signal" },
    { value: "data_availability", label: "Data availability" },
    { value: "operating_context", label: "Operating context" },
  ],
  epistemicStatus: [
    { value: "verified", label: "Verified" },
    { value: "calculated", label: "Calculated" },
    { value: "rule_based", label: "Rule based" },
    { value: "inference", label: "Inference" },
    { value: "missing", label: "Missing" },
    { value: "stale", label: "Stale" },
  ],
  freshness: [
    { value: "unknown", label: "Unknown" },
    { value: "current", label: "Current" },
    { value: "aging", label: "Aging" },
    { value: "stale", label: "Stale" },
  ],
  confidence: [
    { value: "unknown", label: "Unknown" },
    { value: "low", label: "Low" },
    { value: "moderate", label: "Moderate" },
    { value: "high", label: "High" },
  ],
  publicationEligibility: [
    { value: "restricted", label: "Restricted" },
    { value: "internal_only", label: "Internal only" },
    { value: "review_required", label: "Review required" },
    { value: "eligible", label: "Eligible" },
  ],
  capability: [
    { value: "operational-analytics-support", label: "Prepayment and credit model fit" },
    { value: "data-quality-modernization", label: "Loan and market data readiness" },
    { value: "portfolio-reporting-workflow", label: "Valuation and risk reporting fit" },
    { value: "scenario-planning-support", label: "Macro and stress scenario fit" },
    { value: "governance-process-review", label: "Model validation and governance fit" },
  ],
  ruleOutcome: [
    { value: "awarded", label: "Awarded" },
    { value: "not_awarded", label: "Not awarded" },
    { value: "not_evaluated_missing", label: "Not evaluated — missing" },
    { value: "not_evaluated_stale", label: "Not evaluated — stale" },
    { value: "not_evaluated_restricted", label: "Not evaluated — restricted" },
    { value: "blocked_by_gate", label: "Blocked by gate" },
  ],
  periodCategory: [
    { value: "known_period", label: "Known period" },
    { value: "unknown_period", label: "Unknown period" },
  ],
  sourceType: [
    { value: "synthetic_fixture", label: "Synthetic fixture" },
    { value: "synthetic_document", label: "Synthetic document" },
    { value: "synthetic_observation", label: "Synthetic observation" },
  ],
  validationStatus: [
    { value: "validated", label: "Validated" },
    { value: "unvalidated", label: "Unvalidated" },
    { value: "rejected", label: "Rejected" },
  ],
  licenseStatus: [
    { value: "synthetic_demo", label: "Synthetic demo" },
    { value: "unknown", label: "Unknown" },
    { value: "permitted_internal", label: "Permitted internal" },
  ],
  accessClassification: [
    { value: "synthetic", label: "Synthetic" },
    { value: "internal", label: "Internal" },
    { value: "restricted", label: "Restricted" },
  ],
  reportingPeriod: [
    { value: "known_period", label: "Known period" },
    { value: "unknown_period", label: "Unknown period" },
  ],
  syntheticStatus: [{ value: "synthetic", label: "Synthetic" }],
} as const;

function viewHref(view: EvidenceCatalogPageView, nextView: "evidence" | "provenance") {
  const params = new URLSearchParams();
  if (nextView !== "evidence") params.set("view", nextView);
  if (view.formValues.text) params.set("q", view.formValues.text);
  for (const key of [
    "evidenceType",
    "epistemicStatus",
    "freshness",
    "confidence",
    "publicationEligibility",
    "capability",
    "ruleOutcome",
    "periodCategory",
    "sourceType",
    "validationStatus",
    "licenseStatus",
    "accessClassification",
    "reportingPeriod",
    "syntheticStatus",
  ] as const) {
    for (const value of view.formValues[key]) params.append(key, value);
  }
  if (view.formValues.orgRef) params.set("orgRef", view.formValues.orgRef);
  if (view.pageSize !== 20) params.set("pageSize", String(view.pageSize));
  const query = params.toString();
  return query ? `/evidence?${query}` : "/evidence";
}

function selectedSummary(view: EvidenceCatalogPageView) {
  return view.activeFilters;
}

function EvidenceRows({ rows }: { rows: readonly EvidenceCatalogRowView[] }) {
  return (
    <div
      className="il-local-table-scroll"
      role="region"
      aria-label="Evidence catalog table"
      tabIndex={0}
    >
      <table className="il-ledger-table">
        <caption>Evidence catalog results</caption>
        <thead>
          <tr>
            <th scope="col">Evidence</th>
            <th scope="col">Organization</th>
            <th scope="col">Type and status</th>
            <th scope="col">Observed</th>
            <th scope="col">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.title}-${row.organizationName}-${index}`}>
              <th scope="row">
                {row.title}
                {row.state === "available" ? (
                  <span className="il-score-disclosure">{row.summary}</span>
                ) : null}
              </th>
              <td>
                <Link href={row.organizationDetailHref}>{row.organizationName}</Link>
              </td>
              <td>
                {row.evidenceTypeLabel};{" "}
                {row.state === "available" ? `${row.epistemicStatusLabel}; ` : ""}
                {row.freshness}; {row.confidence}; {row.publicationEligibility.replace(/_/g, " ")}
              </td>
              <td>{row.state === "available" ? row.observedAtLabel : "Withheld"}</td>
              <td>
                {row.state === "available"
                  ? (row.provenanceSourceName ?? "Not provided")
                  : "Withheld"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProvenanceRows({ rows }: { rows: readonly ProvenanceCatalogRowView[] }) {
  return (
    <div
      className="il-local-table-scroll"
      role="region"
      aria-label="Provenance catalog table"
      tabIndex={0}
    >
      <table className="il-ledger-table">
        <caption>Provenance catalog results</caption>
        <thead>
          <tr>
            <th scope="col">Source</th>
            <th scope="col">Type</th>
            <th scope="col">Validation</th>
            <th scope="col">Access</th>
            <th scope="col">Dates</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.sourceName}-${index}`}>
              <th scope="row">{row.sourceName}</th>
              <td>{row.sourceTypeLabel}</td>
              <td>
                {row.validationStatus}; {row.licenseStatus}
              </td>
              <td>{row.accessClassification}</td>
              <td>
                Published {row.publishedAtLabel}; retrieved {row.retrievedAtLabel}; reporting{" "}
                {row.reportingPeriodLabel}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EvidenceCatalogPage({ view }: { view: EvidenceCatalogPageView }) {
  const selected = selectedSummary(view);
  const unavailable =
    view.state === "unauthorized" || view.state === "error" || view.state === "unavailable";

  return (
    <div className="il-phase6-page">
      <PageHeader
        title="Evidence catalog"
        description="Inspect publication-safe synthetic evidence and its provenance records."
        meta={
          <div className="il-research-meta">
            <span>{view.verticalLabel}</span>
            <span>{view.totalCount} results</span>
          </div>
        }
      />
      <SyntheticNotice>{view.syntheticNotice}</SyntheticNotice>
      <p className="il-research-disclaimer">{view.heuristicDisclaimer}</p>

      {view.state === "unauthorized" ? (
        <RestrictedState
          title="Evidence catalog restricted"
          description={view.stateMessage ?? "This catalog is restricted."}
        />
      ) : unavailable ? (
        <ErrorState
          title="Evidence catalog unavailable"
          description={view.stateMessage ?? "The catalog could not load."}
        />
      ) : (
        <>
          <nav className="il-view-switcher" aria-label="Catalog view">
            <Link
              href={viewHref(view, "evidence")}
              aria-current={view.view === "evidence" ? "page" : undefined}
            >
              Evidence
            </Link>
            <Link
              href={viewHref(view, "provenance")}
              aria-current={view.view === "provenance" ? "page" : undefined}
            >
              Provenance
            </Link>
          </nav>

          {view.state === "malformed_query" ? (
            <ErrorState
              title="Unsupported or invalid filters"
              description={view.errorSummary ?? "Reset the catalog filters."}
            />
          ) : null}
          {view.unknownParams.length > 0 ? (
            <p role="status" className="il-selected-summary">
              Unsupported parameters were ignored and did not broaden results.
            </p>
          ) : null}

          <form className="il-explorer-filters" action="/evidence" method="get">
            <input type="hidden" name="view" value={view.view} />
            {view.formValues.orgRef ? (
              <input type="hidden" name="orgRef" value={view.formValues.orgRef} />
            ) : null}
            <details open>
              <summary>Search and page size</summary>
              <div className="il-filter-grid">
                <TextInput
                  label="Search"
                  id="evidence-q"
                  name="q"
                  defaultValue={view.formValues.text}
                  maxLength={100}
                />
                <Select
                  label="Page size"
                  id="evidence-page-size"
                  name="pageSize"
                  defaultValue={String(view.pageSize)}
                >
                  <option value="20">20</option>
                  <option value="40">40</option>
                </Select>
              </div>
            </details>
            <details open>
              <summary>Evidence filters</summary>
              <div className="il-filter-checkbox-grid">
                <CheckboxFilterGroup
                  legend="Evidence type"
                  name="evidenceType"
                  options={FILTERS.evidenceType}
                  selected={view.formValues.evidenceType}
                />
                <CheckboxFilterGroup
                  legend="Epistemic status"
                  name="epistemicStatus"
                  options={FILTERS.epistemicStatus}
                  selected={view.formValues.epistemicStatus}
                />
                <CheckboxFilterGroup
                  legend="Freshness"
                  name="freshness"
                  options={FILTERS.freshness}
                  selected={view.formValues.freshness}
                />
                <CheckboxFilterGroup
                  legend="Confidence"
                  name="confidence"
                  options={FILTERS.confidence}
                  selected={view.formValues.confidence}
                />
                <CheckboxFilterGroup
                  legend="Publication eligibility"
                  name="publicationEligibility"
                  options={FILTERS.publicationEligibility}
                  selected={view.formValues.publicationEligibility}
                />
                <CheckboxFilterGroup
                  legend="Capability affected"
                  name="capability"
                  options={FILTERS.capability}
                  selected={view.formValues.capability}
                />
                <CheckboxFilterGroup
                  legend="Rule outcome"
                  name="ruleOutcome"
                  options={FILTERS.ruleOutcome}
                  selected={view.formValues.ruleOutcome}
                />
                <CheckboxFilterGroup
                  legend="Effective period"
                  name="periodCategory"
                  options={FILTERS.periodCategory}
                  selected={view.formValues.periodCategory}
                />
              </div>
            </details>
            <details open={view.view === "provenance"}>
              <summary>Provenance filters</summary>
              <div className="il-filter-checkbox-grid">
                <CheckboxFilterGroup
                  legend="Source type"
                  name="sourceType"
                  options={FILTERS.sourceType}
                  selected={view.formValues.sourceType}
                />
                <CheckboxFilterGroup
                  legend="Validation status"
                  name="validationStatus"
                  options={FILTERS.validationStatus}
                  selected={view.formValues.validationStatus}
                />
                <CheckboxFilterGroup
                  legend="License status"
                  name="licenseStatus"
                  options={FILTERS.licenseStatus}
                  selected={view.formValues.licenseStatus}
                />
                <CheckboxFilterGroup
                  legend="Access classification"
                  name="accessClassification"
                  options={FILTERS.accessClassification}
                  selected={view.formValues.accessClassification}
                />
                <CheckboxFilterGroup
                  legend="Reporting period"
                  name="reportingPeriod"
                  options={FILTERS.reportingPeriod}
                  selected={view.formValues.reportingPeriod}
                />
                <CheckboxFilterGroup
                  legend="Synthetic status"
                  name="syntheticStatus"
                  options={FILTERS.syntheticStatus}
                  selected={view.formValues.syntheticStatus}
                />
              </div>
            </details>
            <div className="il-filter-actions">
              <Button type="submit" variant="primary">
                Apply filters
              </Button>
              <Link
                className="il-button il-button--secondary il-button--md"
                href={view.clearAllHref}
              >
                Clear all
              </Link>
            </div>
          </form>

          <div className="il-selected-summary" aria-label="Selected filters">
            <strong>Selected filters</strong>
            {selected.length > 0 ? (
              <ul className="il-filter-summary-list">
                {selected.map((item) => (
                  <li key={`${item.label}-${item.removeHref}`}>
                    <span>{item.label}</span>{" "}
                    <Link href={item.removeHref} aria-label={`Remove ${item.label}`}>
                      Remove
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>None. Showing the complete catalog.</p>
            )}
          </div>

          {view.pagination.beyondRange ? (
            <EmptyState
              title="Page out of range"
              description="This page is outside the current result set."
              actionLabel="Go to last page"
              actionHref={view.pagination.recoveryHref ?? "/evidence"}
            />
          ) : view.rows.length === 0 ? (
            <EmptyState
              title="No matching records"
              description="No records match the selected filters."
              actionLabel="Clear all filters"
              actionHref="/evidence"
            />
          ) : view.view === "evidence" ? (
            <EvidenceRows rows={view.rows as readonly EvidenceCatalogRowView[]} />
          ) : (
            <ProvenanceRows rows={view.rows as readonly ProvenanceCatalogRowView[]} />
          )}

          {view.pagination.pageHrefs.length > 0 ? (
            <nav className="il-pagination" aria-label="Evidence catalog pagination">
              {view.pagination.previousHref ? (
                <Link href={view.pagination.previousHref}>Previous</Link>
              ) : (
                <span aria-disabled="true">Previous</span>
              )}
              {view.pagination.pageHrefs.map((item) => (
                <Link
                  key={item.page}
                  href={item.href}
                  aria-current={item.current ? "page" : undefined}
                >
                  {item.page}
                </Link>
              ))}
              {view.pagination.nextHref ? (
                <Link href={view.pagination.nextHref}>Next</Link>
              ) : (
                <span aria-disabled="true">Next</span>
              )}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
