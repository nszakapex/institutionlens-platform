import Link from "next/link";

/**
 * Generic invitation / access-pending surface.
 * Must not confirm whether an account or workspace exists.
 */
export function AccessPendingScreen() {
  return (
    <div className="il-access-pending">
      <main id="main" className="il-access-pending-inner" tabIndex={-1}>
        <p className="il-eyebrow">InstitutionLens</p>
        <h1 className="il-page-title">Invitation required</h1>
        <p className="il-lede">
          This workspace is available only to invited founding clients. If you already have access,
          sign in with the credentials you were issued. If you are waiting on an invitation, contact
          the InstitutionLens operator through the channel they provided.
        </p>
        <p className="il-field-hint">
          For privacy, this page does not confirm whether an account or workspace exists.
        </p>
        <p className="il-filter-actions">
          <Link className="il-button il-button--primary il-button--md" href="/login">
            Sign in
          </Link>
          <Link className="il-button il-button--secondary il-button--md" href="/request-access">
            Request access information
          </Link>
          <Link className="il-button il-button--ghost il-button--md" href="/">
            Public site
          </Link>
        </p>
      </main>
    </div>
  );
}
