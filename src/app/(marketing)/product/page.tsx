import type { Metadata } from "next";
import Link from "next/link";
import { marketingMetadataBase } from "@/lib/marketing";
import { RelationshipPaths } from "@/components/svg/RelationshipPaths";

export const metadata: Metadata = {
  ...marketingMetadataBase,
  title: "Product",
  description:
    "InstitutionLens product overview: evidence-backed research workspace for mortgage analytics teams preparing institutional outreach.",
};

const SURFACE_ROWS = [
  {
    index: "01",
    title: "Organizations",
    copy: "Searchable institutional records with explainable fit and quality signals. Identity, vertical, and assessment context stay legible instead of collapsing into a single opaque score.",
  },
  {
    index: "02",
    title: "Evidence",
    copy: "Provenance-aware cataloging so claims stay attached to sources and limitations. Source class, freshness window, and completeness posture travel with every item.",
  },
  {
    index: "03",
    title: "Compare",
    copy: "Bounded side-by-side review for a small set of institutions. The limit is deliberate — comparison supports judgment rather than replacing it.",
  },
  {
    index: "04",
    title: "Briefs",
    copy: "Structured research preparation artifacts for internal review, with methodology and limitation language available alongside the content.",
  },
  {
    index: "05",
    title: "Methodology",
    copy: "Versioned assessment rules and publication boundaries in plain language, so a reviewer can see exactly how any signal was produced.",
  },
] as const;

export default function ProductPage() {
  return (
    <main id="main" className="il-mkt-main" tabIndex={-1}>
      <section className="il-band" aria-labelledby="product-title">
        <div className="il-band-inner">
          <header className="il-band-heading">
            <p className="il-eyebrow">Product</p>
            <h1 id="product-title" className="il-mkt-display il-mkt-display--page">
              A workspace for institutional outreach research
            </h1>
            <p className="il-mkt-support">
              InstitutionLens brings organization context, evidence, comparison, and briefs into one
              reviewable surface for mortgage risk-analytics teams preparing institutional
              conversations.
            </p>
          </header>
        </div>
      </section>

      <section className="il-band il-band--raised" aria-labelledby="product-surfaces">
        <div className="il-band-inner">
          <div className="il-band-heading">
            <p className="il-eyebrow">What you work with</p>
            <h2 id="product-surfaces" className="il-mkt-section-title">
              The five working surfaces
            </h2>
          </div>
          <div className="il-ledger-rows">
            {SURFACE_ROWS.map(({ index, title, copy }) => (
              <div key={index} className="il-ledger-row">
                <div className="il-ledger-row-title">
                  <span className="il-ledger-row-index" aria-hidden="true">
                    {index}
                  </span>
                  <h3>{title}</h3>
                </div>
                <p>{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="il-band" aria-labelledby="product-relationships">
        <div className="il-band-inner il-split">
          <div>
            <p className="il-eyebrow">Made for outreach preparation</p>
            <h2 id="product-relationships" className="il-mkt-section-title">
              Context before contact
            </h2>
            <p className="il-mkt-prose">
              The workspace is built for specialized mortgage analytics firms whose go-to-market
              depends on institutional fit — model licensing, valuation tooling, scenario planning,
              and governance conversations — where the path to a meeting matters as much as the
              institution itself. Evidence, relationships, and boundaries stay reviewable.
            </p>
          </div>
          <div className="il-split-panel">
            <RelationshipPaths />
            <p className="il-split-panel-caption">Access paths · illustrative</p>
          </div>
        </div>
      </section>

      <section className="il-band" aria-labelledby="product-not">
        <div className="il-band-inner">
          <div className="il-band-heading">
            <p className="il-eyebrow">Boundaries</p>
            <h2 id="product-not" className="il-mkt-section-title">
              What it is not
            </h2>
            <p className="il-mkt-prose">
              InstitutionLens is not a marketplace, a CRM, or a scoring black box for automated
              decisions. Publication eligibility and restricted fields remain permissioned inside
              the authenticated workspace.
            </p>
          </div>
          <p className="il-mkt-callout">
            Not investment advice. InstitutionLens does not tell you what to buy, sell, or allocate.
          </p>
          <div className="il-mkt-cta-row">
            <Link href="/how-it-works" className="il-button il-button--secondary il-button--md">
              See how it works
            </Link>
            <Link href="/pricing" className="il-button il-button--ghost il-button--md">
              Founding pricing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
