import type { ReactNode } from "react";

type Tone = "neutral" | "info" | "warning" | "critical" | "inverse";

type Props = {
  children: ReactNode;
  tone?: Tone;
  className?: string;
};

export function StatusBadge({ children, tone = "neutral", className }: Props) {
  return (
    <span
      className={["il-status-badge", `il-status-badge--${tone}`, className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
