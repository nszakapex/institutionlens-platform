import type { ReactNode } from "react";
import Link from "next/link";

type Props = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  children?: ReactNode;
};

export function EmptyState({ title, description, actionLabel, actionHref, children }: Props) {
  return (
    <div className="il-state il-state--empty" role="status">
      <h3 className="il-state-title">{title}</h3>
      <p className="il-state-body">{description}</p>
      {children}
      {actionLabel && actionHref ? (
        <Link className="il-button il-button--secondary il-button--md" href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="il-state il-state--loading" role="status" aria-live="polite">
      <span className="il-loading-bar" aria-hidden="true" />
      <p className="il-state-body">{label}</p>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <div className="il-state il-state--error" role="alert">
      <h3 className="il-state-title">{title}</h3>
      <p className="il-state-body">{description}</p>
    </div>
  );
}

export function RestrictedState({
  title = "Restricted",
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <div className="il-state il-state--restricted" role="status">
      <h3 className="il-state-title">{title}</h3>
      <p className="il-state-body">{description}</p>
    </div>
  );
}

export function SyntheticNotice({
  children,
  label = "Synthetic demo",
}: {
  children?: ReactNode;
  label?: string;
}) {
  return (
    <aside className="il-synthetic-notice" role="note">
      <strong className="il-synthetic-notice-label">{label}</strong>
      <p>
        {children ??
          "Illustrative content only. No real organizations, live scores, or customer data."}
      </p>
    </aside>
  );
}
