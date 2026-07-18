import type { SVGProps } from "react";
import { useId } from "react";

type Props = SVGProps<SVGSVGElement> & {
  decorative?: boolean;
};

/**
 * Quiet background texture — reference grid with sparse graphite nodes.
 * Sized to be placed behind content at low contrast; purely decorative.
 */
export function SignalField({ decorative = true, className, ...props }: Props) {
  const uid = useId();
  const gridId = `${uid}-grid`;

  return (
    <svg
      viewBox="0 0 480 320"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
      focusable="false"
      className={className}
      {...props}
    >
      {!decorative ? <title>Illustrative signal field texture</title> : null}
      <defs>
        <pattern id={gridId} width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M40 0H0V40"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="480" height="320" fill={`url(#${gridId})`} />
      {(
        [
          [56, 244],
          [140, 196],
          [214, 236],
          [296, 152],
          [372, 188],
          [430, 108],
        ] as const
      ).map(([cx, cy], i) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={i === 3 ? 4 : 3}
          fill={i === 3 ? "var(--il-signal-blue)" : "currentColor"}
          opacity={i === 3 ? 0.75 : 0.25}
        />
      ))}
    </svg>
  );
}
