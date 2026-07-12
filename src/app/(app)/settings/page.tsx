import { PlaceholderPage, placeholderMetadata } from "@/components/shell/PlaceholderPage";

export const metadata = placeholderMetadata("Settings");

export default function SettingsPlaceholder() {
  return (
    <PlaceholderPage
      title="Settings"
      summary="Vertical configuration and tenant settings will land in a later phase."
    />
  );
}
