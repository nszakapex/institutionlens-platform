import { useId } from "react";
import type { OrganizationDetailPageView } from "@/application/detail-view-models";

type ReadyView = Extract<OrganizationDetailPageView, { state: "ok" }>;

export function DetailLineage({ view }: { view: ReadyView }) {
  const id = useId().replace(/:/g, "");
  const awarded = view.capabilities
    .flatMap((capability) => capability.ledgerRows.map((rule) => ({ capability, rule })))
    .find(({ rule }) => rule.outcomeLabel === "Awarded" && rule.lineage.length > 0);
  if (!awarded) {
    return (
      <p>
        No awarded rule lineage chain is available for this organization. Unevaluated and unawarded
        rules remain documented in the complete ledgers.
      </p>
    );
  }
  const evidenceTitle = awarded.rule.lineage[0]!;
  const evidenceCard =
    view.evidence.state === "available"
      ? view.evidence.cards.find(
          (card) => card.state === "available" && card.title === evidenceTitle,
        )
      : undefined;
  const source =
    evidenceCard?.state === "available"
      ? (evidenceCard.provenanceSourceName ?? "Provenance not provided")
      : "Restricted evidence source";
  const provenanceCard = view.provenance.cards.find((card) => card.sourceName === source);
  const provenance = provenanceCard
    ? `${provenanceCard.validationStatus} · ${provenanceCard.licenseStatus}`
    : "Restricted or unavailable provenance";
  const evidence = evidenceTitle;
  const capability = awarded.capability.capabilityName;
  const rule = awarded.rule.ruleTitle;
  const labels = [
    source,
    provenance,
    evidence,
    rule,
    capability,
    view.portfolioSummary.portfolioName,
  ];
  const stages = ["Source", "Provenance", "Evidence", "Rule", "Capability", "Portfolio"];

  return (
    <figure className="il-lineage-figure">
      <svg
        viewBox="0 0 960 170"
        role="img"
        aria-labelledby={`${id}-lineage-title ${id}-lineage-description`}
      >
        <title id={`${id}-lineage-title`}>Assessment lineage</title>
        <desc id={`${id}-lineage-description`}>
          Publication-safe source and provenance flow through evidence and deterministic rules into
          capability and portfolio assessments.
        </desc>
        <path d="M90 70 H870" fill="none" stroke="currentColor" strokeWidth="2" />
        {stages.map((stage, index) => {
          const x = 90 + index * 156;
          return (
            <g key={stage}>
              <circle cx={x} cy="70" r="22" fill="var(--il-optic-white)" stroke="currentColor" />
              <text
                x={x}
                y="76"
                textAnchor="middle"
                fontSize="16"
                fontFamily="var(--il-font-serif)"
              >
                {index + 1}
              </text>
              <text
                x={x}
                y="120"
                textAnchor="middle"
                fontSize="12"
                fontFamily="var(--il-font-sans)"
              >
                {stage}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        <ol className="il-lineage-text">
          {stages.map((stage, index) => (
            <li key={stage}>
              <strong>{stage}:</strong> {labels[index]}
            </li>
          ))}
        </ol>
        <p className="il-card-meta">
          This diagram shows one actual awarded rule chain. Capability rows below provide every rule
          outcome and its supporting publication-safe evidence labels.
        </p>
      </figcaption>
    </figure>
  );
}
