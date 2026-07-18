import type { Metadata } from "next";
import Link from "next/link";
import { marketingMetadataBase } from "@/lib/marketing";
import { InstitutionNetwork } from "@/components/svg/InstitutionNetwork";

export const metadata: Metadata = {
  ...marketingMetadataBase,
  title: {
    absolute: "InstitutionLens — Institutional fit, made explainable",
  },
  description:
    "InstitutionLens helps researchers prepare evidence-backed institutional outreach. Not investment advice. Invitation-only founding access.",
};

export default function MarketingHomePage() {
  return (
    <main id="main" className="il-mkt-main" tabIndex={-1}>
      <section className="il-mkt-hero" aria-labelledby="mkt-hero-title">
        <div className="il-mkt-hero-copy">
          <p className="il-mkt-brand">InstitutionLens</p>
          <h1 id="mkt-hero-title" className="il-mkt-display">
            Institutional fit, made explainable
          </h1>
          <p className="il-mkt-support">
            A research workspace for preparing outreach with evidence, provenance, and clear
            assessment boundaries — not a recommendation engine.
          </p>
          <div className="il-mkt-cta-row">
            <Link href="/request-access" className="il-button il-button--primary il-button--md">
              Request founding access
            </Link>
            <Link href="/product" className="il-button il-button--secondary il-button--md">
              Explore the product
            </Link>
          </div>
        </div>
        <div className="il-mkt-hero-visual" aria-hidden="true">
          <InstitutionNetwork className="il-mkt-hero-svg" />
        </div>
      </section>

      <section className="il-mkt-section" aria-labelledby="mkt-boundary-title">
        <h2 id="mkt-boundary-title" className="il-mkt-section-title">
          Built for research preparation
        </h2>
        <p className="il-mkt-prose">
          InstitutionLens organizes organization context, evidence quality, and methodology so
          analysts can review what is known, what is inferred, and what remains incomplete before
          outreach. Fit, confidence, freshness, completeness, and publication eligibility stay
          separate judgments.
        </p>
        <p className="il-mkt-callout">
          Not investment advice. InstitutionLens does not tell you what to buy, sell, or allocate.
        </p>
      </section>
    </main>
  );
}
