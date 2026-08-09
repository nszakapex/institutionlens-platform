import type { Metadata } from "next";
import Link from "next/link";
import { marketingMetadataBase } from "@/lib/marketing";
import { LensMark } from "@/components/svg/LensMark";
import { EvidenceLens } from "@/components/svg/EvidenceLens";
import { ProvenancePath } from "@/components/svg/ProvenancePath";
import { ConfidenceArc } from "@/components/svg/ConfidenceArc";
import { DataLineage } from "@/components/svg/DataLineage";
import { EvidenceTrace } from "@/components/svg/EvidenceTrace";
import { FocusReticle } from "@/components/svg/FocusReticle";
import { FreshnessTimeline } from "@/components/svg/FreshnessTimeline";

export const metadata: Metadata = {
  ...marketingMetadataBase,
  title: {
    absolute: "InstitutionLens — Institutional fit, made explainable",
  },
  description:
    "InstitutionLens helps mortgage risk-analytics teams prepare evidence-backed institutional outreach. Not investment advice. Invitation-only founding access.",
};

const SURFACES = [
  {
    id: "organizations",
    title: "Organizations",
    copy: "Banks, credit unions, and related institutions with explainable fit for modeling, data, reporting, scenarios, and governance — never one opaque score.",
    glyph: <FocusReticle className="il-surface-card-glyph" />,
  },
  {
    id: "evidence",
    title: "Evidence",
    copy: "Provenance-aware cataloging keeps every institutional claim attached to its source class and limitations.",
    glyph: <EvidenceTrace className="il-surface-card-glyph" animated={false} />,
  },
  {
    id: "compare",
    title: "Compare",
    copy: "Bounded side-by-side review for a small prospect shortlist, so outreach judgment stays deliberate.",
    glyph: <ConfidenceArc className="il-surface-card-glyph" />,
  },
  {
    id: "briefs",
    title: "Briefs",
    copy: "Internal prep artifacts for model-licensing and analytics conversations — written for review, not outbound send.",
    glyph: <DataLineage className="il-surface-card-glyph" />,
  },
  {
    id: "methodology",
    title: "Methodology",
    copy: "Versioned assessment rules and publication boundaries, stated in plain language for auditability.",
    glyph: <FreshnessTimeline className="il-surface-card-glyph" />,
  },
] as const;

export default function MarketingHomePage() {
  return (
    <main id="main" className="il-mkt-main" tabIndex={-1}>
      <section className="il-band" aria-labelledby="mkt-hero-title">
        <div className="il-band-inner il-hero">
          <div>
            <p className="il-eyebrow">Mortgage analytics research workspace</p>
            <h1 id="mkt-hero-title" className="il-hero-display">
              Institutional fit, made explainable
            </h1>
            <p className="il-mkt-support">
              Prepare evidence-backed outreach to banks, credit unions, insurers, and asset managers
              before model-licensing conversations — with provenance and clear assessment
              boundaries, not a recommendation engine.
            </p>
            <div className="il-mkt-cta-row">
              <Link href="/request-access" className="il-button il-button--primary il-button--md">
                Request founding access
              </Link>
              <Link href="/product" className="il-button il-button--secondary il-button--md">
                Explore the product
              </Link>
            </div>
            <p className="il-hero-boundary">
              Not investment advice. InstitutionLens does not tell you what to buy, sell, or
              allocate.
            </p>
          </div>
          <div className="il-hero-panel">
            <div className="il-hero-panel-head">
              <p className="il-hero-panel-label">Evidence lens · illustrative geometry</p>
              <LensMark className="il-hero-panel-mark" />
            </div>
            <div className="il-hero-panel-canvas">
              <EvidenceLens />
            </div>
            <ul className="il-hero-readout">
              <li>
                <span>Evidence</span>
                <strong>Source-attached</strong>
              </li>
              <li>
                <span>Provenance</span>
                <strong>Reviewable</strong>
              </li>
              <li>
                <span>Boundaries</span>
                <strong>Explicit</strong>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="il-band" aria-labelledby="mkt-principles-title">
        <div className="il-band-inner">
          <h2 id="mkt-principles-title" className="sr-only">
            Operating principles
          </h2>
          <ul className="il-principles">
            <li>
              <strong>Evidence before judgment</strong>
              <p>
                What is known, what is inferred, and what remains incomplete stay visibly separate
                across the workspace.
              </p>
            </li>
            <li>
              <strong>Provenance you can inspect</strong>
              <p>
                Claims keep a path back to their source class, freshness window, and completeness
                posture.
              </p>
            </li>
            <li>
              <strong>Boundaries stated plainly</strong>
              <p>
                Fit, confidence, freshness, completeness, and publication eligibility are distinct
                judgments — never one collapsed score.
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section className="il-band il-band--raised" aria-labelledby="mkt-surfaces-title">
        <div className="il-band-inner">
          <div className="il-band-heading">
            <p className="il-eyebrow">The workspace</p>
            <h2 id="mkt-surfaces-title" className="il-mkt-section-title">
              Five surfaces, one reviewable line of reasoning
            </h2>
            <p className="il-mkt-support">
              InstitutionLens organizes institutional context, evidence quality, and methodology so
              research and client teams can review the reasoning before outreach.
            </p>
          </div>
          <ul className="il-surface-grid" role="list">
            {SURFACES.map(({ id, title, copy, glyph }) => (
              <li key={id} className="il-surface-card">
                {glyph}
                <h3>{title}</h3>
                <p>{copy}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="il-band" aria-labelledby="mkt-provenance-title">
        <div className="il-band-inner il-split">
          <div>
            <p className="il-eyebrow">Provenance</p>
            <h2 id="mkt-provenance-title" className="il-mkt-section-title">
              Every claim keeps its receipts
            </h2>
            <p className="il-mkt-prose">
              Evidence enters the workspace with its source class, freshness, and completeness
              recorded. Assessments are produced by versioned methodology rules, so a reviewer can
              trace any statement from claim back through transformation to source.
            </p>
            <p className="il-mkt-prose">
              Missing, stale, or restricted evidence is labeled rather than invented.
            </p>
          </div>
          <div className="il-split-panel">
            <ProvenancePath />
            <p className="il-split-panel-caption">Source → transform → claim · illustrative</p>
          </div>
        </div>
      </section>

      <section className="il-band il-band--night" aria-labelledby="mkt-trust-title">
        <div className="il-band-inner">
          <div className="il-band-heading">
            <p className="il-eyebrow">Private by design</p>
            <h2 id="mkt-trust-title" className="il-mkt-section-title">
              Built to stay discreet
            </h2>
          </div>
          <div className="il-night-grid">
            <div className="il-night-cell">
              <h3>Invitation-only</h3>
              <p>
                Workspace access is provisioned by the operator after an offline conversation. There
                is no self-service signup.
              </p>
            </div>
            <div className="il-night-cell">
              <h3>Research stays private</h3>
              <p>
                Authenticated research pages are excluded from public indexing, and raw internal
                identifiers stay off public surfaces.
              </p>
            </div>
            <div className="il-night-cell">
              <h3>Labeled limitations</h3>
              <p>
                The workspace records what it does not know. Gaps are surfaced as gaps, never
                papered over.
              </p>
            </div>
            <div className="il-night-cell">
              <h3>Advice boundary</h3>
              <p>
                InstitutionLens is not investment advice and does not make transactional
                recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="il-band il-band--closing" aria-labelledby="mkt-closing-title">
        <div className="il-band-inner">
          <p className="il-eyebrow">Founding access</p>
          <h2 id="mkt-closing-title" className="il-mkt-display">
            Bring institutional outreach research into focus
          </h2>
          <div className="il-mkt-cta-row">
            <Link href="/request-access" className="il-button il-button--primary il-button--md">
              Request founding access
            </Link>
            <Link href="/pricing" className="il-button il-button--secondary il-button--md">
              View the founding offer
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
