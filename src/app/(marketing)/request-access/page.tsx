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
      <section className="il-band" aria-labelledby="access-title">
        <div className="il-band-inner">
          <header className="il-band-heading">
            <p className="il-eyebrow">Request access</p>
            <h1 id="access-title" className="il-mkt-display il-mkt-display--page">
              Invitation-only founding access
            </h1>
            <p className="il-mkt-support">
              InstitutionLens does not offer self-service signup. Founding clients are invited after
              an offline commercial conversation.
            </p>
          </header>
        </div>
      </section>

      <section className="il-band il-band--raised" aria-labelledby="access-truth">
        <div className="il-band-inner">
          <div className="il-band-heading">
            <p className="il-eyebrow">The honest path</p>
            <h2 id="access-truth" className="il-mkt-section-title">
              How access works
            </h2>
          </div>
          <ol className="il-step-flow">
            <li>
              <h3>Review the product</h3>
              <p>
                Read the product overview, methodology boundaries, and the founding offer before any
                conversation.
              </p>
            </li>
            <li>
              <h3>Reach the operator channel</h3>
              <p>
                Contact InstitutionLens through the operator channel when one is published. Nothing
                on this site collects your details.
              </p>
            </li>
            <li>
              <h3>Sign in if invited</h3>
              <p>
                If invited, you receive credentials out of band and sign in at the secure login
                page.
              </p>
            </li>
          </ol>

          {contactUrl ? (
            <div className="il-mkt-contact-panel">
              <p className="il-mkt-prose">
                An operator-controlled contact channel is configured for this environment. This link
                leaves InstitutionLens and does not create an account by itself.
              </p>
              <div className="il-mkt-cta-row">
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
              </div>
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
              <div className="il-mkt-cta-row">
                <Link href="/login" className="il-button il-button--secondary il-button--md">
                  Sign in
                </Link>
                <Link href="/pricing" className="il-button il-button--ghost il-button--md">
                  View founding offer
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
