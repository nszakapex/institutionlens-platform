"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "@/lib/navigation";
import { IconButton } from "@/components/ui/IconButton";

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        toggleRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const firstLink = panelRef.current?.querySelector<HTMLElement>("a.il-nav-link");
    firstLink?.focus();

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="il-mobile-nav">
      <IconButton
        ref={toggleRef}
        label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="il-menu-glyph" aria-hidden="true">
          {open ? "×" : "☰"}
        </span>
      </IconButton>
      <div
        id={panelId}
        className={["il-mobile-panel", open ? "is-open" : ""].filter(Boolean).join(" ")}
        ref={panelRef}
        hidden={!open}
      >
        <nav aria-label="Primary">
          <ul className="il-nav-list">
            {PRIMARY_NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/app" && pathname.startsWith(`${item.href}/`));
              return (
                <li key={item.id}>
                  {item.available ? (
                    <Link
                      href={item.href}
                      className={["il-nav-link", active ? "is-active" : ""]
                        .filter(Boolean)
                        .join(" ")}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setOpen(false)}
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
      </div>
    </div>
  );
}
