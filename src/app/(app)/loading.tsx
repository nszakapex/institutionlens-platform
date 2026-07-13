import { LoadingState } from "@/components/status/States";

export default function AppLoading() {
  return (
    <div className="il-stack-section" aria-busy="true">
      <LoadingState label="Loading InstitutionLens research surface…" />
      <p className="il-research-disclaimer">
        Metrics are not fabricated while loading. Synthetic demo data will appear when ready.
      </p>
    </div>
  );
}
