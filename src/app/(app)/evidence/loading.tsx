import { LoadingState } from "@/components/status/States";

export default function EvidenceLoading() {
  return (
    <div aria-busy="true">
      <LoadingState label="Loading evidence catalog…" />
      <p className="il-research-disclaimer">
        Result counts and restricted details are withheld until the tenant-safe catalog is ready.
      </p>
    </div>
  );
}
