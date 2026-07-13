import { LoadingState } from "@/components/status/States";

export default function MethodologyLoading() {
  return (
    <div aria-busy="true">
      <LoadingState label="Loading methodology…" />
      <p className="il-research-disclaimer">
        Thresholds and rule text are withheld until the versioned manifest is ready.
      </p>
    </div>
  );
}
