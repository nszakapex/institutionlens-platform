import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { decorative?: boolean };

/** Provenance chain diagram — source → transform → claim. */
export function DataLineage({ decorative = true, className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 280 72"
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
      focusable="false"
      className={className}
      {...props}
    >
      {!decorative ? <title>Illustrative data lineage</title> : null}
      <rect
        x="8"
        y="20"
        width="64"
        height="32"
        fill="var(--il-surface-raised)"
        stroke="currentColor"
        strokeOpacity="0.25"
      />
      <rect
        x="108"
        y="20"
        width="64"
        height="32"
        fill="var(--il-surface-raised)"
        stroke="currentColor"
        strokeOpacity="0.25"
      />
      <rect
        x="208"
        y="20"
        width="64"
        height="32"
        fill="var(--il-surface-selected)"
        stroke="var(--il-signal-blue)"
        strokeOpacity="0.55"
      />
      <path
        d="M72 36h36M172 36h36"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1"
        markerEnd="none"
      />
      <circle cx="90" cy="36" r="2.5" fill="var(--il-signal-blue)" />
      <circle cx="190" cy="36" r="2.5" fill="var(--il-signal-blue)" />
    </svg>
  );
}
