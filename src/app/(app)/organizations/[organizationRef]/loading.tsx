import { LoadingState } from "@/components/status/States";

export default function OrganizationDetailLoading() {
  return (
    <div className="il-stack-section" aria-busy="true">
      <LoadingState label="Loading organization research record…" />
      <p className="il-research-disclaimer">
        Evidence, ledger rows, and conditional scores are withheld until the tenant-safe record is
        ready.
      </p>
    </div>
  );
}
