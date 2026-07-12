import type { Metadata } from "next";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { FilterField } from "@/components/ui/FilterField";
import { DataTable, RecordRow } from "@/components/ui/DataTable";
import { EvidenceLabel } from "@/components/status/EvidenceLabel";
import { Metric } from "@/components/status/Metric";
import { StatusBadge } from "@/components/status/StatusBadge";
import { DataFreshness } from "@/components/status/DataFreshness";
import { PublicationState } from "@/components/status/PublicationState";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  RestrictedState,
  SyntheticNotice,
} from "@/components/status/States";
import {
  ConfidenceArc,
  DataLineage,
  EvidenceTrace,
  FinancialField,
  FitSignal,
  FocusReticle,
  FreshnessTimeline,
  InstitutionNetwork,
  LensMark,
} from "@/components/svg";
import { DomainFoundationStatus } from "@/components/shell/DomainFoundationStatus";
import { getDemoAuthorizationContext } from "@/authorization/demo-context";
import { buildDomainFoundationView } from "@/application/domain-foundation";

export const metadata: Metadata = {
  title: "Design system",
};

type SyntheticOrg = {
  id: string;
  name: string;
  region: string;
  fit: string;
  label: "verified" | "inference" | "stale";
};

const SYNTHETIC_ROWS: SyntheticOrg[] = [
  {
    id: "syn-northbridge",
    name: "Northbridge Example Credit Union",
    region: "Illustrative Northeast",
    fit: "—",
    label: "verified",
  },
  {
    id: "syn-cedar",
    name: "Cedar Hollow Sample Bank",
    region: "Illustrative Midwest",
    fit: "—",
    label: "inference",
  },
  {
    id: "syn-harbor",
    name: "Harborline Demo Institution",
    region: "Illustrative West",
    fit: "—",
    label: "stale",
  },
];

export default function DesignSystemPage() {
  const context = getDemoAuthorizationContext();
  const domainView = buildDomainFoundationView(context);

  return (
    <>
      <PageHeader
        title="Design system preview"
        description="Institutional fit, made explainable — a synthetic shell, component inventory, and domain foundation. No live scores, real organizations, or customer data."
        meta={<StatusBadge tone="info">Phase 3 · Domain foundation</StatusBadge>}
      />

      <SyntheticNotice>
        This page demonstrates the InstitutionLens application shell, design language, and synthetic
        domain core using explicitly fictional examples. It is not a product dashboard.
      </SyntheticNotice>

      <DomainFoundationStatus view={domainView} />

      <section className="il-preview-section" aria-labelledby="type-title">
        <SectionHeader
          eyebrow="Typography"
          title="Editorial decisions, precise controls"
          description="Newsreader carries findings and numerals. Manrope carries navigation, forms, tables, and evidence metadata."
        />
        <div className="il-type-specimen">
          <p className="il-eyebrow">Display</p>
          <strong
            style={{ fontFamily: "var(--il-font-serif)", fontSize: "var(--il-fs-display-2)" }}
          >
            Clarity before coverage.
          </strong>
        </div>
        <div className="il-type-specimen">
          <p className="il-eyebrow">Editorial</p>
          <strong
            style={{ fontFamily: "var(--il-font-serif)", fontSize: "var(--il-fs-editorial)" }}
          >
            Fit increased because need, timing, and access aligned.
          </strong>
        </div>
        <div className="il-type-specimen">
          <p className="il-eyebrow">Interface</p>
          <p style={{ margin: 0, maxWidth: "36rem" }}>
            Evidence labels stay uppercase and tracked. Body copy stays calm. Uppercase never
            appears in display headlines.
          </p>
        </div>
      </section>

      <section className="il-preview-section" aria-labelledby="color-title">
        <SectionHeader
          eyebrow="Color"
          title="Token surfaces"
          description="Signal Blue remains scarce — focus, selection, and material evidence only."
        />
        <div className="il-swatch-grid" aria-label="Brand color tokens">
          <div className="il-swatch" style={{ background: "var(--il-ledger-ivory)" }}>
            <span>Ledger Ivory</span>
            <strong>#F5F1E9</strong>
          </div>
          <div className="il-swatch" style={{ background: "var(--il-optic-white)" }}>
            <span>Optic White</span>
            <strong>#FBFAF7</strong>
          </div>
          <div
            className="il-swatch"
            style={{ background: "var(--il-lens-black)", color: "var(--il-optic-white)" }}
          >
            <span>Lens Black</span>
            <strong>#111310</strong>
          </div>
          <div className="il-swatch" style={{ background: "var(--il-signal-blue)", color: "#fff" }}>
            <span>Signal Blue</span>
            <strong>#0A52D6</strong>
          </div>
          <div
            className="il-swatch"
            style={{ background: "var(--il-ledger-steel)", color: "#fff" }}
          >
            <span>Ledger Steel</span>
            <strong>#64655F</strong>
          </div>
          <div
            className="il-swatch"
            style={{ background: "var(--il-private-night)", color: "var(--il-optic-white)" }}
          >
            <span>Private Night</span>
            <strong>#111719</strong>
          </div>
        </div>
      </section>

      <section className="il-preview-section" aria-labelledby="metrics-title">
        <SectionHeader
          eyebrow="Product status"
          title="Five separate judgments"
          description="Never merged into one opaque score. Values below are placeholders, not assessments."
        />
        <div className="il-metric-grid">
          <Metric kind="fit" value="—" detail="Rule-pack alignment" />
          <Metric kind="confidence" value="—" detail="Evidence strength" />
          <Metric kind="freshness" value="—" detail="Temporal validity" />
          <Metric kind="completeness" value="—" detail="Required coverage" />
          <Metric kind="publication" value="—" detail="Export policy gate" />
        </div>
        <div className="il-control-row" style={{ marginTop: "1.5rem" }}>
          <DataFreshness state="aging" asOfLabel="illustrative Q2 sample" />
          <PublicationState state="draft" />
        </div>
      </section>

      <section className="il-preview-section" aria-labelledby="labels-title">
        <SectionHeader
          eyebrow="Epistemic labels"
          title="Evidence states"
          description="Shape and wording differ so color is never the only cue. Inference must not look verified."
        />
        <div className="il-label-row">
          <EvidenceLabel kind="verified" />
          <EvidenceLabel kind="calculated" />
          <EvidenceLabel kind="rule-based" />
          <EvidenceLabel kind="inference" />
          <EvidenceLabel kind="missing" />
          <EvidenceLabel kind="stale" />
        </div>
      </section>

      <section className="il-preview-section" aria-labelledby="controls-title">
        <SectionHeader
          eyebrow="Controls"
          title="Forms and actions"
          description="Square geometry, hairline borders, visible focus."
        />
        <div className="il-control-row" style={{ marginBottom: "1.5rem" }}>
          <Button variant="primary">Primary action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Destructive</Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
        </div>
        <div
          style={{
            display: "grid",
            gap: "1.25rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
          }}
        >
          <TextInput
            label="Portfolio question"
            name="portfolio"
            placeholder="Illustrative commercial question"
            hint="Synthetic field — not submitted."
          />
          <TextInput
            label="Required example"
            name="required-example"
            error="This field shows an associated error state."
            defaultValue=""
          />
          <Select label="Vertical adapter" name="vertical" defaultValue="fi" hint="Placeholder.">
            <option value="fi">financial_institutions (synthetic)</option>
            <option value="later" disabled>
              Other verticals — later
            </option>
          </Select>
          <FilterField label="Filter organizations" name="filter" placeholder="Synthetic search" />
          <Checkbox label="Show only export-eligible drafts" name="export-only" />
        </div>
      </section>

      <section className="il-preview-section" aria-labelledby="table-title">
        <SectionHeader
          eyebrow="Records"
          title="Synthetic table and interactive record"
          description="Names are unmistakably fictional. Fit values are withheld pending the scoring phase."
        />
        <DataTable
          caption="Synthetic organizations for design preview"
          getRowId={(row) => row.id}
          rows={SYNTHETIC_ROWS}
          columns={[
            {
              key: "name",
              header: "Organization",
              render: (row) => row.name,
            },
            {
              key: "region",
              header: "Region",
              render: (row) => row.region,
            },
            {
              key: "fit",
              header: "Fit",
              numeric: true,
              render: (row) => row.fit,
            },
            {
              key: "label",
              header: "Evidence",
              render: (row) => <EvidenceLabel kind={row.label} />,
            },
          ]}
        />
        <div style={{ marginTop: "1.25rem" }}>
          <RecordRow
            href="#record"
            title="Northbridge Example Credit Union"
            subtitle="Synthetic record · Illustrative Northeast"
            meta={
              <>
                <EvidenceLabel kind="verified" />
                <StatusBadge tone="info">In focus</StatusBadge>
              </>
            }
            trailing={
              <span className="il-metric-value" style={{ fontSize: "2rem" }}>
                —
              </span>
            }
          />
        </div>
      </section>

      <section className="il-preview-section" aria-labelledby="states-title">
        <SectionHeader
          eyebrow="System states"
          title="Empty, loading, error, restricted"
          description="Calm language. No fake activity feeds."
        />
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
          }}
        >
          <EmptyState
            title="No organizations yet"
            description="A later phase will load synthetic fixtures into this explorer."
            actionLabel="Back to overview"
            actionHref="/"
          />
          <LoadingState label="Preparing synthetic preview…" />
          <ErrorState description="The requested synthetic view could not be rendered." />
          <RestrictedState description="Restricted internal evidence is not available in demo mode." />
        </div>
      </section>

      <section className="il-preview-section" aria-labelledby="svg-title">
        <SectionHeader
          eyebrow="Visual language"
          title="SVG instrument primitives"
          description="Decorative diagrams use aria-hidden. They illustrate brand grammar — not live market data."
        />
        <div className="il-svg-gallery">
          <article className="il-svg-card">
            <h3>Lens mark</h3>
            <LensMark width={72} height={72} style={{ color: "var(--il-lens-black)" }} />
          </article>
          <article className="il-svg-card">
            <h3>Financial field</h3>
            <FinancialField />
          </article>
          <article className="il-svg-card">
            <h3>Fit signal</h3>
            <FitSignal scoreLabel="—" />
          </article>
          <article className="il-svg-card">
            <h3>Evidence trace</h3>
            <EvidenceTrace />
          </article>
          <article className="il-svg-card">
            <h3>Focus reticle</h3>
            <FocusReticle width={96} height={96} />
          </article>
          <article className="il-svg-card">
            <h3>Institution network</h3>
            <InstitutionNetwork />
          </article>
          <article className="il-svg-card">
            <h3>Confidence arc</h3>
            <ConfidenceArc />
          </article>
          <article className="il-svg-card">
            <h3>Freshness timeline</h3>
            <FreshnessTimeline />
          </article>
          <article className="il-svg-card">
            <h3>Data lineage</h3>
            <DataLineage />
          </article>
        </div>
      </section>
    </>
  );
}
