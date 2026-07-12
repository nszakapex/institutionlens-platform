import { PlaceholderPage, placeholderMetadata } from "@/components/shell/PlaceholderPage";

export const metadata = placeholderMetadata("Organizations");

export default function OrganizationsPlaceholder() {
  return (
    <PlaceholderPage
      title="Organizations"
      summary="Organization explorer, filters, and ranked results will land in a later phase. This route exists so the shell navigation can be evaluated."
    />
  );
}
