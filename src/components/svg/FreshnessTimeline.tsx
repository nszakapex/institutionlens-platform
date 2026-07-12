import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & {
  decorative?: boolean;
  /** Index of the active tick (illustrative). */
  activeIndex?: number;
};

export function FreshnessTimeline({
  decorative = true,
  activeIndex = 2,
  className,
  ...props
}: Props) {
  const ticks = [24, 64, 104, 144, 184];

  return (
    <svg
      viewBox="0 0 208 40"
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
      focusable="false"
      className={className}
      {...props}
    >
      {!decorative ? <title>Illustrative freshness timeline</title> : null}
      <path d="M16 20h176" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
      {ticks.map((x, i) => (
        <g key={x}>
          <circle
            cx={x}
            cy="20"
            r={i === activeIndex ? 5 : 3}
            fill={i === activeIndex ? "var(--il-signal-blue)" : "currentColor"}
            opacity={i === activeIndex ? 1 : 0.35}
          />
        </g>
      ))}
    </svg>
  );
}
