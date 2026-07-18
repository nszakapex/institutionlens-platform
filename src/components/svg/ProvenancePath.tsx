import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & {
  decorative?: boolean;
  animated?: boolean;
};

/**
 * Provenance motif — source plate through transform plate to claim plate,
 * joined by one drawn evidence path. Conceptual geometry, not real lineage.
 */
export function ProvenancePath({ decorative = true, animated = true, className, ...props }: Props) {
  const plates = [
    { x: 10, accent: false },
    { x: 136, accent: false },
    { x: 262, accent: true },
  ] as const;

  return (
    <svg
      viewBox="0 0 360 120"
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
      focusable="false"
      className={`il-svg-provenance${animated ? " is-animated" : ""}${className ? ` ${className}` : ""}`}
      {...props}
    >
      {!decorative ? <title>Illustrative provenance path</title> : null}
      {plates.map(({ x, accent }) => (
        <g key={x}>
          <rect
            x={x + 4}
            y="40"
            width="88"
            height="44"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.14"
          />
          <rect
            x={x}
            y="34"
            width="88"
            height="44"
            fill={accent ? "var(--il-surface-selected)" : "var(--il-surface-raised)"}
            stroke={accent ? "var(--il-signal-blue)" : "currentColor"}
            strokeOpacity={accent ? 0.55 : 0.3}
          />
          <path
            d={`M${x + 12} 50h40M${x + 12} 62h56`}
            stroke={accent ? "var(--il-signal-blue)" : "currentColor"}
            strokeOpacity={accent ? 0.5 : 0.3}
            strokeWidth="1"
            fill="none"
          />
        </g>
      ))}
      <path
        className="il-svg-trace-path"
        pathLength={1}
        d="M98 56h28M224 56h28"
        fill="none"
        stroke="var(--il-signal-blue)"
        strokeWidth="1.5"
      />
      <circle cx="112" cy="56" r="3" fill="var(--il-signal-blue)" />
      <circle cx="238" cy="56" r="3" fill="var(--il-signal-blue)" />
    </svg>
  );
}
