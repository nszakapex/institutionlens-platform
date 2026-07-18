import Link from "next/link";
import { LensMark } from "@/components/svg/LensMark";
import { MARKETING_NAV } from "@/lib/marketing";

type Props = {
  currentPath: string;
};

export function MarketingHeader({ currentPath }: Props) {
  return (
    <header className="il-mkt-header">
      <div className="il-mkt-header-inner">
        <Link href="/" className="il-wordmark">
          <LensMark className="il-wordmark-mark" width={28} height={28} />
          <span>InstitutionLens</span>
        </Link>
        <nav className="il-mkt-nav" aria-label="Marketing">
          <ul className="il-mkt-nav-list">
            {MARKETING_NAV.map((item) => {
              const active = currentPath === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={["il-mkt-nav-link", active ? "is-active" : ""]
                      .filter(Boolean)
                      .join(" ")}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="il-mkt-header-actions">
          <Link href="/login" className="il-button il-button--ghost il-button--sm">
            Sign in
          </Link>
          <Link href="/request-access" className="il-button il-button--primary il-button--sm">
            Request access
          </Link>
        </div>
      </div>
    </header>
  );
}
