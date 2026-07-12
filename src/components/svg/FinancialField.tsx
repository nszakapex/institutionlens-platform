import type { SVGProps } from "react";
import { useId } from "react";

type Props = SVGProps<SVGSVGElement> & {
  decorative?: boolean;
  animated?: boolean;
};

/**
 * Quiet field of institutional signals converging on a selected point.
 * Illustrative only — not real organization data.
 */
export function FinancialField({ decorative = true, animated = true, className, ...props }: Props) {
  const uid = useId();
  const gridId = `${uid}-grid`;
  const fadeId = `${uid}-fade`;

  return (
    <svg
      viewBox="0 0 480 240"
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
      focusable="false"
      className={`il-svg-field${animated ? " is-animated" : ""}${className ? ` ${className}` : ""}`}
      {...props}
    >
      {!decorative ? (
        <title>Illustrative financial field of converging synthetic signals</title>
      ) : null}
      <defs>
        <pattern id={gridId} width="24" height="24" patternUnits="userSpaceOnUse">
          <path
            d="M24 0H0V24"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="1"
          />
        </pattern>
        <radialGradient id={fadeId} cx="68%" cy="48%" r="55%">
          <stop offset="0" stopColor="var(--il-signal-blue)" stopOpacity="0.1" />
          <stop offset="1" stopColor="var(--il-signal-blue)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="480" height="240" fill="var(--il-surface-env)" />
      <rect width="480" height="240" fill={`url(#${gridId})`} />
      <rect width="480" height="240" fill={`url(#${fadeId})`} />
      <path
        className="il-svg-trace-path"
        pathLength={1}
        d="M24 180C96 150 140 170 180 130s90 10 140 40 80-30 120-20"
        fill="none"
        stroke="var(--il-signal-blue)"
        strokeWidth="1.5"
      />
      <path
        className="il-svg-trace-path il-svg-trace-muted"
        pathLength={1}
        d="M24 120C100 110 130 70 190 90s70 70 130 40 90-70 140-40"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.28"
        strokeWidth="1.25"
      />
      {(
        [
          [24, 180],
          [90, 155],
          [180, 130],
          [260, 155],
          [340, 120],
          [440, 100],
        ] as const
      ).map(([cx, cy], i) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={i === 4 ? 5 : 3.5}
          fill={i === 4 ? "var(--il-signal-blue)" : "currentColor"}
          opacity={i === 4 ? 1 : 0.35}
        />
      ))}
      <circle
        className="il-svg-halo"
        cx="340"
        cy="120"
        r="36"
        fill="var(--il-signal-blue)"
        opacity="0.08"
      />
    </svg>
  );
}
