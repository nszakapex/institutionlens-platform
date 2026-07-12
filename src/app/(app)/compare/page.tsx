import { PlaceholderPage, placeholderMetadata } from "@/components/shell/PlaceholderPage";

export const metadata = placeholderMetadata("Compare");

export default function ComparePlaceholder() {
  return (
    <PlaceholderPage
      title="Compare"
      summary="Bounded comparison of up to three organizations will land in a later phase."
    />
  );
}
