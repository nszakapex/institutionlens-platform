import type { Metadata } from "next";
import Link from "next/link";
import { marketingMetadataBase } from "@/lib/marketing";

export const metadata: Metadata = {
  ...marketingMetadataBase,
  title: "Pricing",
  description:
    "InstitutionLens founding offer: $200 one-time setup plus $99 per month. Invitation-only access.",
};

export default function PricingPage() {
  return (
    <main id="main" className="il-mkt-main" tabIndex={-1}>
      <header className="il-mkt-page-header">
        <p className="il-eyebrow">Pricing</p>
        <h1 className="il-mkt-display il-mkt-display--page">Founding client offer</h1>
        <p className="il-mkt-support">
          Simple founding terms for invited clients. Commercial details beyond this offer are
          confirmed offline — this page does not invent seat counts, outcome promises, or contract
          language.
        </p>
      </header>

      <section className="il-mkt-section" aria-labelledby="founding-offer">
        <h2 id="founding-offer" className="il-mkt-section-title">
          Founding offer
        </h2>
        <div className="il-mkt-price-block">
          <p className="il-mkt-price-line">
            <span className="il-mkt-price">$200</span>
            <span className="il-mkt-price-meta">one-time setup</span>
          </p>
          <p className="il-mkt-price-line">
            <span className="il-mkt-price">$99</span>
            <span className="il-mkt-price-meta">per month</span>
          </p>
        </div>
        <ul className="il-mkt-list">
          <li>Invitation-only founding access to the InstitutionLens research workspace.</li>
          <li>Human-operated onboarding outside self-service signup.</li>
          <li>
            No public customer marks, outcome claims, or invented service commitments on this page.
          </li>
        </ul>
        <p className="il-mkt-callout">
          Payments and billing are handled offline. This site does not process cards or create
          accounts automatically.
        </p>
        <p className="il-mkt-cta-row">
          <Link href="/request-access" className="il-button il-button--primary il-button--md">
            Request founding access
          </Link>
          <Link href="/product" className="il-button il-button--ghost il-button--md">
            Review the product
          </Link>
        </p>
      </section>
    </main>
  );
}
