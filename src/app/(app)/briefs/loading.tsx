import { LoadingState } from "@/components/status/States";

export default function BriefsLoading() {
  return (
    <div aria-busy="true">
      <LoadingState label="Loading briefs…" />
      <p className="il-research-disclaimer">
        Brief details are withheld until the tenant-safe read model is ready.
      </p>
    </div>
  );
}
