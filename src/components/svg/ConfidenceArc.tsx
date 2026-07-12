import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & {
  decorative?: boolean;
  /** 0–1 illustrative arc fill; not a live confidence score. */
  value?: number;
};

export function ConfidenceArc({ decorative = true, value = 0.72, className, ...props }: Props) {
  const clamped = Math.min(1, Math.max(0, value));
  const angle = clamped * 180;
  const rad = ((180 - angle) * Math.PI) / 180;
  const x = 60 + 48 * Math.cos(rad);
  const y = 70 - 48 * Math.sin(rad);

  return (
    <svg
      viewBox="0 0 120 80"
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
      focusable="false"
      className={className}
      {...props}
    >
      {!decorative ? <title>Illustrative confidence arc</title> : null}
      <path
        d="M12 70A48 48 0 0 1 108 70"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.15"
        strokeWidth="6"
        strokeLinecap="square"
      />
      <path
        d={`M12 70A48 48 0 0 1 ${x} ${y}`}
        fill="none"
        stroke="var(--il-signal-blue)"
        strokeWidth="6"
        strokeLinecap="square"
      />
    </svg>
  );
}
