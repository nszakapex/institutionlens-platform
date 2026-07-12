import { PlaceholderPage, placeholderMetadata } from "@/components/shell/PlaceholderPage";

export const metadata = placeholderMetadata("Briefs");

export default function BriefsPlaceholder() {
  return (
    <PlaceholderPage
      title="Briefs"
      summary="Template-based research briefs will land in a later phase."
    />
  );
}
