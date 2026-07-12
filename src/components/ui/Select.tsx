import type { SelectHTMLAttributes, ReactNode } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  children: ReactNode;
  hint?: string;
};

export function Select({ label, hint, id, className, children, ...props }: Props) {
  const selectId = id ?? props.name ?? "select";
  const hintId = hint ? `${selectId}-hint` : undefined;

  return (
    <div className={["il-field", className].filter(Boolean).join(" ")}>
      <label className="il-label" htmlFor={selectId}>
        {label}
      </label>
      <select id={selectId} className="il-select" aria-describedby={hintId} {...props}>
        {children}
      </select>
      {hint ? (
        <p id={hintId} className="il-field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
