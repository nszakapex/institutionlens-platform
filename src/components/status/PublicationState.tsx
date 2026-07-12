import { StatusBadge } from "./StatusBadge";

export type PublicationKind = "draft" | "approved-internal" | "export-eligible" | "blocked";

type Props = {
  state: PublicationKind;
};

const COPY: Record<
  PublicationKind,
  { label: string; tone: "neutral" | "info" | "warning" | "critical"; note: string }
> = {
  draft: {
    label: "Draft",
    tone: "neutral",
    note: "Internal draft. Not approved for circulation.",
  },
  "approved-internal": {
    label: "Approved internal",
    tone: "info",
    note: "Approved for internal use. Not automatically export-eligible.",
  },
  "export-eligible": {
    label: "Export-eligible",
    tone: "info",
    note: "Passed publication-safety checks for bounded export.",
  },
  blocked: {
    label: "Blocked",
    tone: "critical",
    note: "Publication safety checks failed or restricted evidence present.",
  },
};

export function PublicationState({ state }: Props) {
  const meta = COPY[state];

  return (
    <span className="il-publication-state">
      <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
      <span className="sr-only">{meta.note}</span>
    </span>
  );
}
