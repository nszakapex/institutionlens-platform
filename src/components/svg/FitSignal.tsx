import type { SVGProps } from "react";
import { useId } from "react";

type Props = SVGProps<SVGSVGElement> & {
  decorative?: boolean;
  scoreLabel?: string;
  animated?: boolean;
};

/**
 * Factor composition diagram — illustrative synthetic fit signal.
 * Does not represent a live score.
 */
export function FitSignal({
  decorative = true,
  scoreLabel = "—",
  animated = true,
  className,
  ...props
}: Props) {
  const uid = useId();

  return (
    <svg
      viewBox="0 0 320 220"
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
      focusable="false"
      className={`il-svg-fit${animated ? " is-animated" : ""}${className ? ` ${className}` : ""}`}
      {...props}
    >
      {!decorative ? <title>Illustrative fit signal diagram</title> : null}
      <rect width="320" height="220" fill="var(--il-surface-raised)" />
      <g transform="translate(20 10)">
        <circle cx="120" cy="100" r="78" fill="none" stroke="currentColor" strokeOpacity="0.12" />
        <circle cx="120" cy="100" r="52" fill="none" stroke="currentColor" strokeOpacity="0.12" />
        <path d="M120 22v156M42 100h156" stroke="currentColor" strokeOpacity="0.15" fill="none" />
        <path
          className="il-svg-trace-path"
          d="M120 30 178 100 120 170 62 100Z"
          fill="var(--il-signal-blue)"
          fillOpacity="0.08"
          stroke="var(--il-signal-blue)"
          strokeWidth="2"
        />
        {[
          [120, 30],
          [178, 100],
          [120, 170],
          [62, 100],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" fill="var(--il-signal-blue)" />
        ))}
      </g>
      <text
        x="230"
        y="88"
        fill="var(--il-signal-blue)"
        fontSize="9"
        fontFamily="var(--il-font-sans)"
        letterSpacing="1.2"
        fontWeight="600"
      >
        ILLUSTRATIVE
      </text>
      <text
        x="230"
        y="128"
        fill="currentColor"
        fontSize="36"
        fontFamily="var(--il-font-serif)"
        id={`${uid}-score`}
      >
        {scoreLabel}
      </text>
    </svg>
  );
}
