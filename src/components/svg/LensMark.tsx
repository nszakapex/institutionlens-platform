import type { SVGProps } from "react";
import { useId } from "react";

type MarkProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

/**
 * InstitutionLens optical mark — geometry preserved.
 * Do not rotate, motion-transform, glow, distort, or shadow.
 */
export function LensMark({ title = "InstitutionLens mark", ...props }: MarkProps) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
      {...props}
    >
      <title id={titleId}>{title}</title>
      <desc id={descId}>Four graphite planes with a Signal Blue focal axis.</desc>
      <rect width="64" height="64" fill="none" />
      <path d="M9 8h7v48H9zM47 8h7v48h-7z" fill="currentColor" />
      <path d="M25 8h6l-4 48h-6zM37 8h6l-4 48h-6z" fill="currentColor" />
      <path d="M32 11v42" stroke="var(--il-signal-blue)" strokeWidth="2" fill="none" />
      <circle cx="32" cy="32" r="3.5" fill="var(--il-signal-blue)" />
    </svg>
  );
}
