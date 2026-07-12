export const EVIDENCE_LABELS = {
  verified: {
    id: "verified",
    label: "Verified",
    description: "Confirmed against an approved source record in-system.",
  },
  calculated: {
    id: "calculated",
    label: "Calculated",
    description: "Derived by a documented formula from verified or calculated inputs.",
  },
  "rule-based": {
    id: "rule-based",
    label: "Rule-based",
    description: "Produced by an explicit, versioned rule-pack clause.",
  },
  inference: {
    id: "inference",
    label: "Inference",
    description: "Heuristic judgment. Must not be presented as verified fact.",
  },
  missing: {
    id: "missing",
    label: "Missing",
    description: "Expected field or factor is absent.",
  },
  stale: {
    id: "stale",
    label: "Stale",
    description: "Previously known evidence past its freshness expectation.",
  },
} as const;

export type EvidenceLabelKind = keyof typeof EVIDENCE_LABELS;

type Props = {
  kind: EvidenceLabelKind;
  className?: string;
};

export function EvidenceLabel({ kind, className }: Props) {
  const meta = EVIDENCE_LABELS[kind];

  return (
    <span
      className={["il-evidence-label", `il-evidence-label--${kind}`, className]
        .filter(Boolean)
        .join(" ")}
      title={meta.description}
    >
      <span className="il-evidence-label-mark" aria-hidden="true" />
      <span className="il-evidence-label-text">{meta.label}</span>
      <span className="sr-only">. {meta.description}</span>
    </span>
  );
}
