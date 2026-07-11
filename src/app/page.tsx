import Link from "next/link";
import { getDemoPrincipal } from "@/lib/demo-tenant";

export const dynamic = "force-dynamic";

const FACTORS = [
  {
    name: "Organizational profile fit",
    detail: "Whether the organization’s structure and profile match the portfolio frame.",
  },
  {
    name: "Capability alignment",
    detail: "Whether offered capabilities map to documented organizational needs.",
  },
  {
    name: "Publicly evidenced need",
    detail: "Whether public evidence supports a material need signal.",
  },
  {
    name: "Timing / change signals",
    detail: "Whether recent change suggests attention now rather than later.",
  },
  {
    name: "Operational compatibility",
    detail: "Whether operating constraints are compatible with delivery realities.",
  },
] as const;

const DIMENSIONS = [
  {
    name: "Fit",
    detail: "Portfolio alignment under a pinned, versioned rule pack — never an opaque blend.",
  },
  {
    name: "Confidence",
    detail: "Strength and quality of supporting evidence, kept separate from fit.",
  },
  {
    name: "Freshness",
    detail: "Temporal validity of material evidence against stated expectations.",
  },
  {
    name: "Completeness",
    detail: "Presence of required fields and factors, including explicit Missing labels.",
  },
  {
    name: "Publication eligibility",
    detail: "Whether an output may leave the system under policy — independent of approval.",
  },
] as const;

export default function FoundationPage() {
  const principal = getDemoPrincipal();

  return (
    <>
      <div className="demo-banner" role="status">
        <div className="demo-banner-inner">
          <strong>Synthetic demo foundation</strong>
          <span>Non-production local-demo principal</span>
          <span>No real organization data</span>
          <span>
            Tenant <code>{principal.tenantId}</code>
          </span>
        </div>
      </div>

      <div className="shell">
        <header className="site-header">
          <Link className="wordmark" href="/">
            {/* Static SVG via img keeps CSP strict (no optimizer / inline SVG). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/institutionlens-mark.svg" alt="" width={28} height={28} />
            <span>InstitutionLens</span>
          </Link>
          <p className="header-meta">Application foundation · Phase 1 · Clean-room build</p>
        </header>

        <main id="main" tabIndex={-1}>
          <section className="hero" aria-labelledby="foundation-title">
            <p className="hero-kicker">Institutional fit intelligence</p>
            <h1 id="foundation-title">Institutional fit, made explainable.</h1>
            <p className="hero-lead">
              This repository hosts the InstitutionLens application foundation. It currently renders
              a branded synthetic demo shell only. There is no organization explorer, scoring
              engine, comparison workspace, or research-brief library yet — and there is no real
              institutional data in this build.
            </p>
          </section>

          <div className="panel-grid">
            <section className="panel" aria-labelledby="factors-title">
              <h2 id="factors-title">Conceptual factor categories</h2>
              <p>
                Approved as conceptual categories only. They are not weights, thresholds, or a
                transplanted model from any prior prototype.
              </p>
              <ul className="factor-list">
                {FACTORS.map((factor) => (
                  <li key={factor.name}>
                    <span>Factor</span>
                    <strong>{factor.name}</strong>
                    <p>{factor.detail}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="panel" aria-labelledby="dimensions-title">
              <h2 id="dimensions-title">Separate assessment dimensions</h2>
              <p>
                InstitutionLens does not collapse judgment into one opaque score. These dimensions
                remain distinct in the domain model and in the interface.
              </p>
              <ul className="metric-list">
                {DIMENSIONS.map((dimension) => (
                  <li key={dimension.name}>
                    <span>Dimension</span>
                    <strong>{dimension.name}</strong>
                    <p>{dimension.detail}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <footer className="footer-note">
            <p>
              Demo mode: <code>{principal.mode}</code>. {principal.label}. Production deployment is
              not permitted while demo authentication is in place. Future tenant isolation requires
              PostgreSQL RLS and is not claimed here.
            </p>
          </footer>
        </main>
      </div>
    </>
  );
}
