import type { SVGProps } from "react";
import { useId } from "react";

type Props = SVGProps<SVGSVGElement> & {
  decorative?: boolean;
  label?: string;
};

/** Graphite node — observed organization or contextual datapoint. */
export function SignalNode({
  decorative = true,
  label = "Signal node",
  className,
  ...props
}: Props) {
  const uid = useId();
  if (decorative) {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        className={className}
        {...props}
      >
        <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.45" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" role="img" aria-labelledby={uid} className={className} {...props}>
      <title id={uid}>{label}</title>
      <circle cx="12" cy="12" r="4" fill="var(--il-signal-blue)" />
    </svg>
  );
}
