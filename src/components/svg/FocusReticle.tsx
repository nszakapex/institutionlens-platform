import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & {
  decorative?: boolean;
};

/** Crosshair for the current decision object. */
export function FocusReticle({ decorative = true, className, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
      focusable="false"
      className={className}
      {...props}
    >
      {!decorative ? <title>Focus reticle</title> : null}
      <circle
        cx="32"
        cy="32"
        r="22"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="1"
      />
      <circle
        cx="32"
        cy="32"
        r="12"
        fill="none"
        stroke="var(--il-signal-blue)"
        strokeOpacity="0.55"
        strokeWidth="1"
      />
      <path
        d="M32 4v12M32 48v12M4 32h12M48 32h12"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1"
        fill="none"
      />
      <circle cx="32" cy="32" r="3" fill="var(--il-signal-blue)" />
    </svg>
  );
}
