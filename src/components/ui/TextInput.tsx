import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextInput({ label, hint, error, id, className, ...props }: Props) {
  const inputId = id ?? props.name ?? "text-input";
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={["il-field", className].filter(Boolean).join(" ")}>
      <label className="il-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className={["il-input", error ? "is-invalid" : ""].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="il-field-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="il-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
