import type { Metadata } from "next";
import Link from "next/link";
import { marketingMetadataBase } from "@/lib/marketing";

export const metadata: Metadata = {
  ...marketingMetadataBase,
  title: "How it works",
  description:
    "How InstitutionLens supports evidence-backed research workflows, provenance, permissions, and honest limitations.",
};

export default function HowItWorksPage() {
  return (
    <main id="main" className="il-mkt-main" tabIndex={-1}>
      <header className="il-mkt-page-header">
        <p className="il-eyebrow">How it works</p>
        <h1 className="il-mkt-display il-mkt-display--page">Evidence first, then judgment</h1>
        <p className="il-mkt-support">
          The workflow is designed for reviewability: gather evidence, apply a versioned
          methodology, inspect quality signals, and prepare outreach with clear boundaries.
        </p>
      </header>

      <section className="il-mkt-section" aria-labelledby="workflow-steps">
        <h2 id="workflow-steps" className="il-mkt-section-title">
          Research workflow
        </h2>
        <ol className="il-mkt-steps">
          <li>
            <strong>Review organizations</strong> in context — identity, vertical, and assessment
            signals without collapsing them into a single opaque score.
          </li>
          <li>
            <strong>Inspect evidence and provenance</strong> so each claim can be traced to a source
            class, freshness window, and completeness posture.
          </li>
          <li>
            <strong>Compare within bounds</strong> — side-by-side review stays limited so judgment
            remains human and deliberate.
          </li>
          <li>
            <strong>Prepare briefs</strong> for internal research use, with methodology and
            limitation language available alongside the content.
          </li>
        </ol>
      </section>

      <section className="il-mkt-section" aria-labelledby="trust-boundaries">
        <h2 id="trust-boundaries" className="il-mkt-section-title">
          Trust and boundaries
        </h2>
        <ul className="il-mkt-list">
          <li>
            <strong>Permissions</strong> — authenticated workspace access is invitation-only and
            role-scoped.
          </li>
          <li>
            <strong>Privacy</strong> — research pages are not for public indexing; raw internal
            identifiers stay off public surfaces.
          </li>
          <li>
            <strong>Limitations</strong> — missing, stale, or restricted evidence is labeled rather
            than invented.
          </li>
          <li>
            <strong>Advice boundary</strong> — InstitutionLens is not investment advice and does not
            make transactional recommendations.
          </li>
        </ul>
        <p className="il-mkt-cta-row">
          <Link href="/request-access" className="il-button il-button--primary il-button--md">
            Request founding access
          </Link>
          <Link href="/login" className="il-button il-button--secondary il-button--md">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
