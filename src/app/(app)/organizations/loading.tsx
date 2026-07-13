import { LoadingState } from "@/components/status/States";

export default function OrganizationsLoading() {
  return (
    <div className="il-stack-section" aria-busy="true">
      <LoadingState label="Loading organization explorer…" />
      <p className="il-research-disclaimer">
        Result counts and scores are withheld until the tenant-safe read model is ready.
      </p>
    </div>
  );
}
