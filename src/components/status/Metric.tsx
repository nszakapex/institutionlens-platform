import type { ReactNode } from "react";

export type MetricKind = "fit" | "confidence" | "freshness" | "completeness" | "publication";

const KIND_META: Record<MetricKind, { label: string; description: string }> = {
  fit: {
    label: "Fit",
    description:
      "Portfolio alignment under a pinned rule pack — not blended with other dimensions.",
  },
  confidence: {
    label: "Confidence",
    description: "Strength and quality of supporting evidence.",
  },
  freshness: {
    label: "Freshness",
    description: "Temporal validity of material evidence.",
  },
  completeness: {
    label: "Completeness",
    description: "Presence of required fields and factors.",
  },
  publication: {
    label: "Publication eligibility",
    description: "Whether an output may leave the system under policy.",
  },
};

type Props = {
  kind: MetricKind;
  value: ReactNode;
  detail?: string;
  className?: string;
};

export function Metric({ kind, value, detail, className }: Props) {
  const meta = KIND_META[kind];

  return (
    <div
      className={["il-metric", `il-metric--${kind}`, className].filter(Boolean).join(" ")}
      data-metric={kind}
    >
      <span className="il-metric-label">{meta.label}</span>
      <strong className="il-metric-value">{value}</strong>
      {detail ? <p className="il-metric-detail">{detail}</p> : null}
      <span className="sr-only">{meta.description}</span>
    </div>
  );
}
