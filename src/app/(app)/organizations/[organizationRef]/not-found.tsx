import Link from "next/link";
import { EmptyState, SyntheticNotice } from "@/components/status/States";
import { PageHeader } from "@/components/ui/PageHeader";

export default function OrganizationDetailNotFound() {
  return (
    <div className="il-phase6-page">
      <PageHeader
        title="Organization not found"
        description="The requested synthetic organization record is unavailable."
      />
      <SyntheticNotice />
      <EmptyState
        title="No matching organization"
        description="The reference is invalid, unavailable, or outside this workspace."
      >
        <Link className="il-button il-button--secondary il-button--md" href="/organizations">
          Browse organizations
        </Link>
      </EmptyState>
    </div>
  );
}
