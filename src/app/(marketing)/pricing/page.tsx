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
      <section className="il-band" aria-labelledby="pricing-title">
        <div className="il-band-inner">
          <header className="il-band-heading">
            <p className="il-eyebrow">Pricing</p>
            <h1 id="pricing-title" className="il-mkt-display il-mkt-display--page">
              Founding client offer
            </h1>
            <p className="il-mkt-support">
              Simple founding terms for invited clients. Commercial details beyond this offer are
              confirmed offline — this page does not invent seat counts, outcome promises, or
              contract language.
            </p>
          </header>
        </div>
      </section>

      <section className="il-band il-band--raised" aria-labelledby="founding-offer">
        <div className="il-band-inner">
          <h2 id="founding-offer" className="sr-only">
            Founding offer
          </h2>
          <div className="il-price-panel">
            <p className="il-price-panel-head">Founding offer · invitation-only</p>
            <div className="il-price-lines">
              <p className="il-price-line">
                <span className="il-price">$200</span>
                <span className="il-price-meta">one-time setup</span>
              </p>
              <p className="il-price-line">
                <span className="il-price">$99</span>
                <span className="il-price-meta">per month</span>
              </p>
            </div>
            <ul className="il-price-terms">
              <li>Invitation-only founding access to the InstitutionLens research workspace.</li>
              <li>Human-operated onboarding outside self-service signup.</li>
              <li>
                No public customer marks, outcome claims, or invented service commitments on this
                page.
              </li>
            </ul>
          </div>
          <p className="il-mkt-callout">
            Payments and billing are handled offline. This site does not process cards or create
            accounts automatically.
          </p>
          <div className="il-mkt-cta-row">
            <Link href="/request-access" className="il-button il-button--primary il-button--md">
              Request founding access
            </Link>
            <Link href="/product" className="il-button il-button--ghost il-button--md">
              Review the product
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
