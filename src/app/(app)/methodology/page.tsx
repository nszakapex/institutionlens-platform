import { PlaceholderPage, placeholderMetadata } from "@/components/shell/PlaceholderPage";

export const metadata = placeholderMetadata("Methodology");

export default function MethodologyPlaceholder() {
  return (
    <PlaceholderPage
      title="Methodology"
      summary="Versioned methodology documentation will land in a later phase."
    />
  );
}
