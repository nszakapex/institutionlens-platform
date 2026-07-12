import type { InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

export function Checkbox({ label, id, className, ...props }: Props) {
  const checkId = id ?? props.name ?? "checkbox";

  return (
    <label className={["il-checkbox", className].filter(Boolean).join(" ")} htmlFor={checkId}>
      <input id={checkId} type="checkbox" className="il-checkbox-input" {...props} />
      <span className="il-checkbox-box" aria-hidden="true" />
      <span className="il-checkbox-text">{label}</span>
    </label>
  );
}
