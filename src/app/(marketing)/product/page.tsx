import type { Metadata } from "next";
import Link from "next/link";
import { marketingMetadataBase } from "@/lib/marketing";

export const metadata: Metadata = {
  ...marketingMetadataBase,
  title: "Product",
  description:
    "InstitutionLens product overview: evidence-backed institutional research workspace for outreach preparation.",
};

export default function ProductPage() {
  return (
    <main id="main" className="il-mkt-main" tabIndex={-1}>
      <header className="il-mkt-page-header">
        <p className="il-eyebrow">Product</p>
        <h1 className="il-mkt-display il-mkt-display--page">
          A workspace for institutional research
        </h1>
        <p className="il-mkt-support">
          InstitutionLens brings organization context, evidence, comparison, and briefs into one
          reviewable surface for researchers preparing outreach.
        </p>
      </header>

      <section className="il-mkt-section" aria-labelledby="product-surfaces">
        <h2 id="product-surfaces" className="il-mkt-section-title">
          What you work with
        </h2>
        <ul className="il-mkt-list">
          <li>
            <strong>Organizations</strong> — searchable institutional records with explainable fit
            and quality signals.
          </li>
          <li>
            <strong>Evidence</strong> — provenance-aware cataloging so claims stay attached to
            sources and limitations.
          </li>
          <li>
            <strong>Compare</strong> — bounded side-by-side review for a small set of institutions.
          </li>
          <li>
            <strong>Briefs</strong> — structured research preparation artifacts for internal review.
          </li>
          <li>
            <strong>Methodology</strong> — versioned assessment rules and publication boundaries in
            plain language.
          </li>
        </ul>
      </section>

      <section className="il-mkt-section" aria-labelledby="product-not">
        <h2 id="product-not" className="il-mkt-section-title">
          What it is not
        </h2>
        <p className="il-mkt-prose">
          InstitutionLens is not a marketplace, a CRM, or a scoring black box for automated
          decisions. It is not investment advice. Publication eligibility and restricted fields
          remain permissioned inside the authenticated workspace.
        </p>
        <p className="il-mkt-cta-row">
          <Link href="/how-it-works" className="il-button il-button--secondary il-button--md">
            See how it works
          </Link>
          <Link href="/pricing" className="il-button il-button--ghost il-button--md">
            Founding pricing
          </Link>
        </p>
      </section>
    </main>
  );
}
