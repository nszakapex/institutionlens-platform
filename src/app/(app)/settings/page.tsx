import { getRequestAccess } from "@/authorization/request-access";
import { PlaceholderPage, placeholderMetadata } from "@/components/shell/PlaceholderPage";

export const metadata = placeholderMetadata("Settings");

export default async function SettingsPlaceholder() {
  await getRequestAccess();

  return (
    <PlaceholderPage
      title="Settings"
      summary="Vertical configuration and tenant settings will land in a later phase."
    />
  );
}
