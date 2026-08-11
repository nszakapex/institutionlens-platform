import type { Metadata } from "next";
import Link from "next/link";
import { getRequestAccess } from "@/authorization/request-access";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";
import { SyntheticNotice } from "@/components/status/States";

export const metadata: Metadata = {
  title: "Settings",
  description: "Workspace readiness and founding-client configuration.",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function SettingsPage() {
  const access = await getRequestAccess();
  const { context, mode, synthetic } = access;

  const readiness = [
    {
      label: "Authenticated workspace gate",
      ready: true,
      detail: mode === "local-demo" ? "Local-demo principal active" : `Live mode: ${mode}`,
    },
    {
      label: "Document vault",
      ready: context.permissions.includes("document:read"),
      detail: context.permissions.includes("document:upload")
        ? "Upload and link enabled for this role"
        : "Read-only document access for this role",
    },
    {
      label: "Institutional research surfaces",
      ready: true,
      detail: "Organizations, evidence, compare, briefs, methodology",
    },
    {
      label: "Card billing (Stripe)",
      ready: false,
      detail: "Offline founding invoice until Stripe keys are configured in a live cutover",
    },
    {
      label: "Live Postgres document writes",
      ready: !synthetic && false,
      detail: synthetic
        ? "Synthetic local vault only — privileged write RPCs not cut over"
        : "Document write RPCs still pending",
    },
  ] as const;

  return (
    <div className="il-settings-page">
      <PageHeader
        title="Settings"
        description="Founding-client workspace readiness. Commercial onboarding and Auth user provisioning remain operator-managed."
        meta={<StatusBadge tone="info">{context.tenant.displayName}</StatusBadge>}
      />

      {synthetic ? (
        <SyntheticNotice>
          This is the local-demo research workspace. Hosted founding use requires live Auth,
          memberships, and an approved domain cutover.
        </SyntheticNotice>
      ) : null}

      <section className="il-stack-section" aria-labelledby="readiness-title">
        <SectionHeader
          eyebrow="Readiness"
          title="Public-use checklist"
          description="What this workspace can do today versus what still needs live cutover."
        />
        <h2 id="readiness-title" className="sr-only">
          Public-use checklist
        </h2>
        <div className="il-research-table-wrap">
          <table className="il-research-table">
            <thead>
              <tr>
                <th scope="col">Capability</th>
                <th scope="col">Status</th>
                <th scope="col">Detail</th>
              </tr>
            </thead>
            <tbody>
              {readiness.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>
                    <StatusBadge tone={row.ready ? "info" : "neutral"}>
                      {row.ready ? "Ready" : "Pending"}
                    </StatusBadge>
                  </td>
                  <td>{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="il-stack-section" aria-labelledby="vault-title">
        <SectionHeader
          eyebrow="Documents"
          title="Tenant document vault"
          description="Upload research notes, prospect lists, and model-interest materials, then link them to institutions."
        />
        <h2 id="vault-title" className="sr-only">
          Tenant document vault
        </h2>
        <div className="il-filter-actions">
          <Link className="il-button il-button--primary il-button--md" href="/documents">
            Open documents
          </Link>
          <Link className="il-button il-button--secondary il-button--md" href="/organizations">
            Browse organizations
          </Link>
        </div>
      </section>
    </div>
  );
}
