import { StatusBadge } from "./StatusBadge";

type Props = {
  state: "current" | "aging" | "stale" | "unknown";
  asOfLabel?: string;
};

const COPY: Record<Props["state"], { label: string; tone: "neutral" | "info" | "warning" }> = {
  current: { label: "Current", tone: "info" },
  aging: { label: "Aging", tone: "warning" },
  stale: { label: "Stale", tone: "warning" },
  unknown: { label: "Unknown", tone: "neutral" },
};

export function DataFreshness({ state, asOfLabel }: Props) {
  const meta = COPY[state];

  return (
    <span className="il-freshness">
      <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
      {asOfLabel ? <span className="il-freshness-asof">As of {asOfLabel}</span> : null}
    </span>
  );
}
