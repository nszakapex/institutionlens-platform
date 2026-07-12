import Link from "next/link";
import { PRIMARY_NAV } from "@/lib/navigation";

type Props = {
  currentPath: string;
};

export function PrimaryNavigation({ currentPath }: Props) {
  return (
    <nav className="il-primary-nav" aria-label="Primary">
      <ul className="il-nav-list">
        {PRIMARY_NAV.map((item) => {
          const active = currentPath === item.href;
          return (
            <li key={item.id}>
              {item.available ? (
                <Link
                  href={item.href}
                  className={["il-nav-link", active ? "is-active" : ""].filter(Boolean).join(" ")}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="il-nav-link is-disabled"
                  title={item.description}
                  aria-disabled="true"
                >
                  {item.label}
                  <span className="il-nav-later">Later</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
