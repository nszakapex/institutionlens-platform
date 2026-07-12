import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  meta?: ReactNode;
  children?: ReactNode;
};

export function PageHeader({ title, description, meta, children }: Props) {
  return (
    <header className="il-page-header">
      <div className="il-page-header-copy">
        <h1 className="il-page-title">{title}</h1>
        {description ? <p className="il-page-lead">{description}</p> : null}
      </div>
      {meta ? <div className="il-page-header-meta">{meta}</div> : null}
      {children}
    </header>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="il-section-header">
      {eyebrow ? <p className="il-eyebrow">{eyebrow}</p> : null}
      <h2 className="il-section-title">{title}</h2>
      {description ? <p className="il-section-lead">{description}</p> : null}
    </div>
  );
}
