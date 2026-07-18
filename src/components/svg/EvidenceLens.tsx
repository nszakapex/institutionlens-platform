import type { SVGProps } from "react";
import { useId } from "react";

type Props = SVGProps<SVGSVGElement> & {
  decorative?: boolean;
  animated?: boolean;
};

/**
 * Hero lens composition — a graphite reference field narrowed by focus rings
 * and a crosshair onto one material signal. Illustrative geometry only.
 */
export function EvidenceLens({ decorative = true, animated = true, className, ...props }: Props) {
  const uid = useId();
  const gridId = `${uid}-grid`;
  const fadeId = `${uid}-fade`;

  return (
    <svg
      viewBox="0 0 560 400"
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
      focusable="false"
      className={`il-svg-lens${animated ? " is-animated" : ""}${className ? ` ${className}` : ""}`}
      {...props}
    >
      {!decorative ? <title>Illustrative evidence lens composition</title> : null}
      <defs>
        <pattern id={gridId} width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M40 0H0V40"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="1"
          />
        </pattern>
        <radialGradient id={fadeId} cx="63%" cy="42%" r="52%">
          <stop offset="0" stopColor="var(--il-signal-blue)" stopOpacity="0.09" />
          <stop offset="1" stopColor="var(--il-signal-blue)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="560" height="400" fill={`url(#${gridId})`} />
      <rect width="560" height="400" fill={`url(#${fadeId})`} />
      <path
        className="il-svg-trace-path il-svg-trace-muted"
        pathLength={1}
        d="M28 292C118 236 172 262 236 208s130-74 196-24 62 46 112 8"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.26"
        strokeWidth="1.25"
      />
      <path
        className="il-svg-trace-path"
        pathLength={1}
        d="M28 330c82 4 138-30 202-44s114 26 164-20 66-58 138-88"
        fill="none"
        stroke="var(--il-signal-blue)"
        strokeWidth="1.5"
      />
      {(
        [
          [28, 330],
          [114, 322],
          [230, 286],
          [318, 274],
          [394, 266],
          [488, 210],
        ] as const
      ).map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" fill="currentColor" opacity="0.35" />
      ))}
      <g className="il-svg-lens-rings" fill="none" stroke="currentColor">
        <circle cx="352" cy="168" r="118" strokeOpacity="0.14" />
        <circle cx="352" cy="168" r="76" strokeOpacity="0.2" />
        <circle cx="352" cy="168" r="38" stroke="var(--il-signal-blue)" strokeOpacity="0.4" />
      </g>
      <path
        d="M352 22v292M206 168h292"
        stroke="currentColor"
        strokeOpacity="0.28"
        strokeWidth="1"
        fill="none"
      />
      <circle
        className="il-svg-halo"
        cx="352"
        cy="168"
        r="30"
        fill="var(--il-signal-blue)"
        opacity="0.08"
      />
      <circle cx="352" cy="168" r="6" fill="var(--il-signal-blue)" />
    </svg>
  );
}
