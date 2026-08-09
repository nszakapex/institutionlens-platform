import type { Metadata } from "next";
import Link from "next/link";
import { marketingMetadataBase } from "@/lib/marketing";
import { FinancialField } from "@/components/svg/FinancialField";

export const metadata: Metadata = {
  ...marketingMetadataBase,
  title: "How it works",
  description:
    "How InstitutionLens supports evidence-backed research workflows, provenance, permissions, and honest limitations.",
};

const WORKFLOW = [
  {
    title: "Review organizations in context",
    copy: "Identity, vertical, and assessment signals stay legible without collapsing into a single opaque score.",
  },
  {
    title: "Inspect evidence and provenance",
    copy: "Each claim can be traced to a source class, freshness window, and completeness posture.",
  },
  {
    title: "Compare within bounds",
    copy: "Side-by-side review stays limited so judgment remains human and deliberate.",
  },
  {
    title: "Prepare briefs",
    copy: "Internal research artifacts for institutional conversations carry methodology and limitation language alongside the content.",
  },
] as const;

const TENETS = [
  {
    title: "Permissions",
    copy: "Authenticated workspace access is invitation-only and role-scoped.",
  },
  {
    title: "Privacy",
    copy: "Research pages are not for public indexing; raw internal identifiers stay off public surfaces.",
  },
  {
    title: "Limitations",
    copy: "Missing, stale, or restricted evidence is labeled rather than invented.",
  },
  {
    title: "Advice boundary",
    copy: "InstitutionLens is not investment advice and does not make transactional recommendations.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <main id="main" className="il-mkt-main" tabIndex={-1}>
      <section className="il-band" aria-labelledby="hiw-title">
        <div className="il-band-inner">
          <header className="il-band-heading">
            <p className="il-eyebrow">How it works</p>
            <h1 id="hiw-title" className="il-mkt-display il-mkt-display--page">
              Evidence first, then judgment
            </h1>
            <p className="il-mkt-support">
              The workflow is designed for reviewability: gather institutional evidence, apply a
              versioned methodology, inspect quality signals, and prepare model-licensing or
              analytics outreach with clear boundaries.
            </p>
          </header>
        </div>
      </section>

      <section className="il-band il-band--raised" aria-labelledby="workflow-steps">
        <div className="il-band-inner">
          <div className="il-band-heading">
            <p className="il-eyebrow">Research workflow</p>
            <h2 id="workflow-steps" className="il-mkt-section-title">
              Four deliberate steps
            </h2>
          </div>
          <ol className="il-step-flow">
            {WORKFLOW.map(({ title, copy }) => (
              <li key={title}>
                <h3>{title}</h3>
                <p>{copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="il-band" aria-labelledby="signal-field">
        <div className="il-band-inner il-split">
          <div>
            <p className="il-eyebrow">The signal language</p>
            <h2 id="signal-field" className="il-mkt-section-title">
              Signals stay separate, and stay explained
            </h2>
            <p className="il-mkt-prose">
              Graphite marks context and peers; Signal Blue marks material evidence and the object
              in focus. Fit, confidence, freshness, completeness, and publication eligibility are
              reported as distinct judgments, each with its own reasoning.
            </p>
          </div>
          <div className="il-split-panel">
            <FinancialField />
            <p className="il-split-panel-caption">Signal field · illustrative</p>
          </div>
        </div>
      </section>

      <section className="il-band" aria-labelledby="trust-boundaries">
        <div className="il-band-inner">
          <div className="il-band-heading">
            <p className="il-eyebrow">Trust</p>
            <h2 id="trust-boundaries" className="il-mkt-section-title">
              Trust and boundaries
            </h2>
          </div>
          <div className="il-ledger-rows">
            {TENETS.map(({ title, copy }, i) => (
              <div key={title} className="il-ledger-row">
                <div className="il-ledger-row-title">
                  <span className="il-ledger-row-index" aria-hidden="true">
                    {`0${i + 1}`}
                  </span>
                  <h3>{title}</h3>
                </div>
                <p>{copy}</p>
              </div>
            ))}
          </div>
          <div className="il-mkt-cta-row">
            <Link href="/request-access" className="il-button il-button--primary il-button--md">
              Request founding access
            </Link>
            <Link href="/login" className="il-button il-button--secondary il-button--md">
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
