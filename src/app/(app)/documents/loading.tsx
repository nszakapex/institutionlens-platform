import { LoadingState } from "@/components/status/States";

export default function DocumentsLoading() {
  return (
    <div aria-busy="true">
      <LoadingState label="Loading document vault…" />
      <p className="il-research-disclaimer">
        Document counts and file contents are withheld until the tenant-safe vault is ready.
      </p>
    </div>
  );
}
