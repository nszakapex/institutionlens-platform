import type { MethodologyPageView } from "@/application/methodology-view-models";
import { ErrorState, RestrictedState, SyntheticNotice } from "@/components/status/States";
import { StatusBadge } from "@/components/status/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";

export function MethodologyPage({ view }: { view: MethodologyPageView }) {
  const unavailable =
    view.state === "unauthorized" || view.state === "error" || view.state === "unavailable";

  return (
    <div className="il-phase6-page">
      <PageHeader
        title="Methodology"
        description="Versioned, deterministic rules used to describe observed alignment in the synthetic financial-institution dataset."
        meta={
          <div className="il-research-meta">
            <span>{view.verticalLabel}</span>
            <span>Version {view.manifest.methodologyVersion}</span>
          </div>
        }
      />
      <SyntheticNotice>{view.syntheticNotice}</SyntheticNotice>
      <p className="il-research-disclaimer">{view.heuristicDisclaimer}</p>

      {view.state === "unauthorized" ? (
        <RestrictedState
          title="Methodology restricted"
          description={view.stateMessage ?? "This methodology is restricted."}
        />
      ) : unavailable ? (
        <ErrorState
          title="Methodology unavailable"
          description={view.stateMessage ?? "The methodology could not load."}
        />
      ) : (
        <>
          <nav className="il-section-nav" aria-label="Methodology sections">
            <a href="#manifest">Manifest</a>
            <a href="#thresholds">Thresholds</a>
            <a href="#policies">Policies</a>
            <a href="#capability-rules">Capability rules</a>
            <a href="#limitations">Limitations</a>
          </nav>

          <section id="manifest" className="il-research-section" aria-labelledby="manifest-heading">
            <h2 id="manifest-heading">Executable manifest</h2>
            <dl className="il-manifest-grid">
              {[
                ["Engine version", view.manifest.engineVersion],
                ["Domain schema version", view.manifest.domainSchemaVersion],
                ["Adapter version", view.manifest.adapterVersion],
                ["Methodology version", view.manifest.methodologyVersion],
                ["Catalog version", view.manifest.catalogVersion],
                ["Portfolio version", view.manifest.portfolioVersion],
                ["Overlay-set version", view.manifest.overlaySetVersion],
                ["Assessed at", view.manifest.assessedAt],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section
            id="thresholds"
            className="il-research-section"
            aria-labelledby="thresholds-heading"
          >
            <h2 id="thresholds-heading">Declared thresholds</h2>
            <div
              className="il-local-table-scroll"
              role="region"
              aria-label="Observed-alignment band thresholds"
              tabIndex={0}
            >
              <table className="il-ledger-table">
                <caption>Observed-alignment band thresholds</caption>
                <thead>
                  <tr>
                    <th scope="col">Band</th>
                    <th scope="col">Minimum</th>
                    <th scope="col">Maximum</th>
                  </tr>
                </thead>
                <tbody>
                  {view.thresholds.bandThresholds.map((threshold) => (
                    <tr key={threshold.label}>
                      <th scope="row">{threshold.label}</th>
                      <td>{threshold.min}</td>
                      <td>{threshold.max}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="il-summary-grid">
              {view.thresholds.confidenceThresholds.map((threshold) => (
                <div key={threshold.label}>
                  <dt>{threshold.label}</dt>
                  <dd>{threshold.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section id="policies" className="il-research-section" aria-labelledby="policies-heading">
            <h2 id="policies-heading">Assessment policies</h2>
            <div className="il-card-grid">
              <article className="il-evidence-card">
                <h3>Completeness</h3>
                <ul>
                  {view.policies.completenessPolicy.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article className="il-evidence-card">
                <h3>Aggregation</h3>
                <ul>
                  {view.policies.aggregationPolicy.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p>{view.policies.conditionalScoreBehavior}</p>
              </article>
              <article className="il-evidence-card">
                <h3>Confidence</h3>
                <ul>
                  {view.policies.confidencePolicy.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article className="il-evidence-card">
                <h3>Freshness</h3>
                <ul>
                  {view.policies.freshnessPolicy.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article className="il-evidence-card">
                <h3>Publication</h3>
                <ul>
                  {view.policies.publicationPolicy.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article className="il-evidence-card">
                <h3>Opportunity context</h3>
                <p>{view.policies.opportunityRulesSummary}</p>
              </article>
            </div>
            <p className="il-research-disclaimer">{view.policies.humanReviewRequirement}</p>
          </section>

          <section
            id="capability-rules"
            className="il-research-section"
            aria-labelledby="rules-heading"
          >
            <h2 id="rules-heading">Capability rules</h2>
            <nav className="il-section-nav" aria-label="Methodology capability anchors">
              {view.capabilities.map((capability, index) => (
                <a key={capability.name} href={`#method-capability-${index + 1}`}>
                  {capability.name}
                </a>
              ))}
            </nav>
            <div className="il-detail-capabilities">
              {view.capabilities.map((capability, index) => (
                <article
                  id={`method-capability-${index + 1}`}
                  className="il-method-capability"
                  key={capability.name}
                >
                  <h3>{capability.name}</h3>
                  <p>{capability.description}</p>
                  <p className="il-card-meta">
                    {capability.category} · priority {capability.priority} · declared maximum{" "}
                    {capability.declaredMaximumPoints} points · enabled-rule total{" "}
                    {capability.rulePointTotal}
                  </p>
                  <h4>Required gates</h4>
                  <ul>
                    {capability.requiredGates.map((gate) => (
                      <li key={gate.description}>
                        {gate.description} Required evidence:{" "}
                        {gate.requiredEvidenceTypes.join(", ")}.
                      </li>
                    ))}
                  </ul>
                  <div>
                    {capability.rules.map((rule) => (
                      <details className="il-method-rule" key={rule.title}>
                        <summary>
                          {rule.title} · {rule.maximumPoints} points
                        </summary>
                        <div className="il-method-rule-body">
                          <div className="il-detail-statuses">
                            <StatusBadge>{rule.factorCategoryLabel}</StatusBadge>
                            <StatusBadge tone={rule.enabled ? "info" : "warning"}>
                              {rule.enabled ? "Enabled" : "Disabled"}
                            </StatusBadge>
                          </div>
                          <p>{rule.rationale}</p>
                          <p>
                            <strong>Evidence requirements:</strong>{" "}
                            {rule.evidenceRequirements.join(", ")}. Validated provenance{" "}
                            {rule.requiresValidatedProvenance ? "is required" : "is not required"}.
                          </p>
                          <p>{rule.missingEvidencePolicy}</p>
                          <p>{rule.staleEvidencePolicy}</p>
                          <p>{rule.restrictedEvidencePolicy}</p>
                          <p>{rule.methodologyNotes}</p>
                        </div>
                      </details>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section
            id="limitations"
            className="il-research-section"
            aria-labelledby="limitations-heading"
          >
            <h2 id="limitations-heading">Interpretation and limitations</h2>
            <ul>
              {view.disclaimers.map((disclaimer) => (
                <li key={disclaimer}>{disclaimer}</li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
