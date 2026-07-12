import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
};

export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { label, className, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={["il-icon-button", className].filter(Boolean).join(" ")}
      aria-label={label}
      {...props}
    >
      {children}
    </button>
  );
});
