import type { DomainFoundationView } from "@/domain/view-models";
import { StatusBadge } from "@/components/status/StatusBadge";
import { SyntheticNotice } from "@/components/status/States";
import { SectionHeader } from "@/components/ui/PageHeader";

type Props = {
  view: DomainFoundationView;
};

/**
 * Server-rendered domain foundation status — not a product dashboard.
 */
export function DomainFoundationStatus({ view }: Props) {
  const coverage = view.evidence.evidenceStateCoverage;
  const epistemic = coverage.byEpistemicStatus;

  return (
    <section className="il-preview-section" aria-labelledby="domain-foundation-title">
      <SectionHeader
        eyebrow="Domain foundation"
        title="Synthetic financial-institutions core"
        description="Phase 3 validates tenant-safe repositories, adapter contracts, and evidence invariants. Fit remains unassessed. Formal completeness remains unknown."
      />

      <SyntheticNotice label="Synthetic dataset">{view.declaration}</SyntheticNotice>

      <SyntheticNotice label="Synthetic Verified">{view.verifiedClarification}</SyntheticNotice>

      <div className="il-domain-status">
        <div className="il-domain-status-row">
          <StatusBadge tone="info">Phase 3 · Domain core</StatusBadge>
          <StatusBadge tone="neutral">Fit Unassessed</StatusBadge>
          <StatusBadge tone="neutral">Completeness unknown</StatusBadge>
          <StatusBadge tone="info">Adapter registered</StatusBadge>
        </div>

        <dl className="il-domain-status-grid">
          <div>
            <dt>Workspace</dt>
            <dd>{view.tenantDisplayName}</dd>
          </div>
          <div>
            <dt>Vertical adapter</dt>
            <dd>
              {view.adapter.displayName} · v{view.adapter.version}
            </dd>
          </div>
          <div>
            <dt>Synthetic organizations</dt>
            <dd>{view.organizationCount}</dd>
          </div>
          <div>
            <dt>Evidence records</dt>
            <dd>{view.evidence.total}</dd>
          </div>
          <div>
            <dt>Formal completeness</dt>
            <dd>Unknown — not assigned in Phase 3</dd>
          </div>
          <div>
            <dt>Fit</dt>
            <dd>Unassessed</dd>
          </div>
          <div>
            <dt>Freshness mix</dt>
            <dd>
              current {view.evidence.byFreshness.current} · aging {view.evidence.byFreshness.aging}{" "}
              · stale {view.evidence.byFreshness.stale} · unknown{" "}
              {view.evidence.byFreshness.unknown}
            </dd>
          </div>
          <div>
            <dt>Publication states</dt>
            <dd>
              internal {view.evidence.byPublication.internal_only} · review{" "}
              {view.evidence.byPublication.review_required} · restricted{" "}
              {view.evidence.byPublication.restricted} · eligible{" "}
              {view.evidence.byPublication.eligible}
            </dd>
          </div>
          <div className="il-domain-status-span">
            <dt>{coverage.label}</dt>
            <dd>
              <ul className="il-domain-coverage-list" aria-label={coverage.label}>
                <li>verified {epistemic.verified}</li>
                <li>calculated {epistemic.calculated}</li>
                <li>rule-based {epistemic.rule_based}</li>
                <li>inference {epistemic.inference}</li>
                <li>missing {epistemic.missing}</li>
                <li>stale {epistemic.stale}</li>
              </ul>
            </dd>
            <p className="il-domain-status-note">{coverage.definition}</p>
          </div>
        </dl>

        <p className="il-domain-status-note">
          Sample records below are fictional display names only. No explorer, ranking, or scoring is
          available in this phase.
        </p>

        <ul className="il-domain-sample-list">
          {view.sampleOrganizations.map((org) => (
            <li key={org.id}>
              <strong>{org.displayName}</strong>
              <span>
                {org.organizationType.replaceAll("_", " ")} · {org.regionLabel} · Fit Unassessed
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
