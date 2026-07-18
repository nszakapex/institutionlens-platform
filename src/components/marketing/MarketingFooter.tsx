import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="il-mkt-footer">
      <div className="il-mkt-footer-inner">
        <p className="il-mkt-footer-brand">InstitutionLens</p>
        <p>
          InstitutionLens supports institutional research and outreach preparation. It is not
          investment advice and does not recommend transactions.
        </p>
        <nav aria-label="Footer">
          <ul className="il-mkt-footer-links">
            <li>
              <Link href="/product">Product</Link>
            </li>
            <li>
              <Link href="/how-it-works">How it works</Link>
            </li>
            <li>
              <Link href="/pricing">Pricing</Link>
            </li>
            <li>
              <Link href="/request-access">Request access</Link>
            </li>
            <li>
              <Link href="/login">Sign in</Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
