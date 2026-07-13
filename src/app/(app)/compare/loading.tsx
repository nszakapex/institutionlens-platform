import { LoadingState } from "@/components/status/States";

export default function CompareLoading() {
  return (
    <div aria-busy="true">
      <LoadingState label="Loading comparison…" />
      <p className="il-research-disclaimer">
        Comparison details are withheld until the tenant-safe read model is ready.
      </p>
    </div>
  );
}
