import type { Metadata } from "next";
import Link from "next/link";
import { getFoundingContactUrl } from "@/lib/env";
import { marketingMetadataBase } from "@/lib/marketing";

export const metadata: Metadata = {
  ...marketingMetadataBase,
  title: "Request access",
  description:
    "InstitutionLens founding access is invitation-only. Learn how to request access without fake form submissions.",
};

export const dynamic = "force-dynamic";

export default function RequestAccessPage() {
  const contactUrl = getFoundingContactUrl();

  return (
    <main id="main" className="il-mkt-main" tabIndex={-1}>
      <header className="il-mkt-page-header">
        <p className="il-eyebrow">Request access</p>
        <h1 className="il-mkt-display il-mkt-display--page">Invitation-only founding access</h1>
        <p className="il-mkt-support">
          InstitutionLens does not offer self-service signup. Founding clients are invited after an
          offline commercial conversation.
        </p>
      </header>

      <section className="il-mkt-section" aria-labelledby="access-truth">
        <h2 id="access-truth" className="il-mkt-section-title">
          How access works
        </h2>
        <ol className="il-mkt-steps">
          <li>Review the product, methodology boundaries, and founding offer.</li>
          <li>Contact InstitutionLens through the operator channel when one is published.</li>
          <li>
            If invited, you receive credentials out of band and sign in at the secure login page.
          </li>
        </ol>

        {contactUrl ? (
          <div className="il-mkt-contact-panel">
            <p className="il-mkt-prose">
              An operator-controlled contact channel is configured for this environment. This link
              leaves InstitutionLens and does not create an account by itself.
            </p>
            <p className="il-mkt-cta-row">
              <a
                className="il-button il-button--primary il-button--md"
                href={contactUrl}
                rel="noopener noreferrer"
              >
                Open contact channel
              </a>
              <Link href="/login" className="il-button il-button--secondary il-button--md">
                Sign in if invited
              </Link>
            </p>
          </div>
        ) : (
          <div className="il-mkt-contact-panel" role="status">
            <p className="il-mkt-prose">
              No public contact or booking channel is configured in this environment yet. There is
              no form to submit here, and this page will not pretend a request was received.
            </p>
            <p className="il-mkt-prose">
              If you were already invited, use <Link href="/login">Sign in</Link>. Otherwise, wait
              for the InstitutionLens operator to share the founding-access channel offline.
            </p>
            <p className="il-mkt-cta-row">
              <Link href="/login" className="il-button il-button--secondary il-button--md">
                Sign in
              </Link>
              <Link href="/pricing" className="il-button il-button--ghost il-button--md">
                View founding offer
              </Link>
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
