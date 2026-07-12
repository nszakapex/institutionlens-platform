import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function FilterField({ label, id, className, ...props }: Props) {
  const fieldId = id ?? props.name ?? "filter";

  return (
    <div className={["il-field il-field--filter", className].filter(Boolean).join(" ")}>
      <label className="il-label" htmlFor={fieldId}>
        {label}
      </label>
      <input id={fieldId} className="il-input" {...props} />
    </div>
  );
}
