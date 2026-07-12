import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { decorative?: boolean };

/** Sparse node network — synthetic peer context only. */
export function InstitutionNetwork({ decorative = true, className, ...props }: Props) {
  const nodes = [
    [20, 60],
    [70, 30],
    [120, 70],
    [170, 40],
    [220, 65],
    [160, 100],
  ] as const;

  return (
    <svg
      viewBox="0 0 240 120"
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
      focusable="false"
      className={className}
      {...props}
    >
      {!decorative ? <title>Illustrative organization network</title> : null}
      <path
        d="M20 60 70 30 120 70 170 40 220 65M120 70 160 100 220 65"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="1"
      />
      {nodes.map(([cx, cy], i) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={i === 2 ? 5 : 3.5}
          fill={i === 2 ? "var(--il-signal-blue)" : "currentColor"}
          opacity={i === 2 ? 1 : 0.4}
        />
      ))}
    </svg>
  );
}
