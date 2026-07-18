import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & {
  decorative?: boolean;
  animated?: boolean;
};

/**
 * Relationship motif — a sparse institutional web with one emphasized
 * access path to the object in focus. Illustrative geometry only.
 */
export function RelationshipPaths({
  decorative = true,
  animated = true,
  className,
  ...props
}: Props) {
  const nodes = [
    [24, 118],
    [78, 52],
    [128, 96],
    [186, 38],
    [216, 108],
  ] as const;

  return (
    <svg
      viewBox="0 0 240 160"
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
      focusable="false"
      className={`il-svg-relationship${animated ? " is-animated" : ""}${className ? ` ${className}` : ""}`}
      {...props}
    >
      {!decorative ? <title>Illustrative relationship paths</title> : null}
      <path
        d="M24 118 78 52M78 52 186 38M128 96 186 38M128 96 216 108"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="1"
      />
      <path
        className="il-svg-trace-path"
        pathLength={1}
        d="M24 118C64 106 96 104 128 96s60-34 88-12"
        fill="none"
        stroke="var(--il-signal-blue)"
        strokeWidth="1.5"
      />
      {nodes.map(([cx, cy], i) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={i === 4 ? 5 : 3.5}
          fill={i === 4 ? "var(--il-signal-blue)" : "currentColor"}
          opacity={i === 4 ? 1 : 0.4}
        />
      ))}
      <circle
        cx="216"
        cy="108"
        r="14"
        fill="none"
        stroke="var(--il-signal-blue)"
        strokeOpacity="0.35"
      />
    </svg>
  );
}
