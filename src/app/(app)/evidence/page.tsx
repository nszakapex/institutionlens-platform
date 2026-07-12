import { PlaceholderPage, placeholderMetadata } from "@/components/shell/PlaceholderPage";

export const metadata = placeholderMetadata("Evidence");

export default function EvidencePlaceholder() {
  return (
    <PlaceholderPage
      title="Evidence"
      summary="Evidence and provenance browsing will land in a later phase."
    />
  );
}
