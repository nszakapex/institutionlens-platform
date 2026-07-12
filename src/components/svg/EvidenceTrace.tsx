import type { SVGProps } from "react";
import { useId } from "react";

type Props = SVGProps<SVGSVGElement> & {
  decorative?: boolean;
  animated?: boolean;
};

/** Drawn evidence path — change through time or provenance chain. */
export function EvidenceTrace({ decorative = true, animated = true, className, ...props }: Props) {
  const uid = useId();
  const gradId = `${uid}-fade`;

  return (
    <svg
      viewBox="0 0 240 80"
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
      focusable="false"
      className={`il-svg-trace${animated ? " is-animated" : ""}${className ? ` ${className}` : ""}`}
      {...props}
    >
      {!decorative ? <title>Evidence trace</title> : null}
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--il-lens-black)" stopOpacity="0.15" />
          <stop offset="1" stopColor="var(--il-signal-blue)" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path
        className="il-svg-trace-path"
        pathLength={1}
        d="M8 58C48 58 62 22 100 28s52 40 84 28 28-36 48-28"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="1.5"
      />
      <circle cx="8" cy="58" r="3" fill="currentColor" opacity="0.35" />
      <circle cx="232" cy="28" r="4" fill="var(--il-signal-blue)" />
    </svg>
  );
}
