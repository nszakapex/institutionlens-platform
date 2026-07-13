import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildOrganizationDetailPageView } from "@/application/detail-service";
import { getDemoAuthorizationContext } from "@/authorization/demo-context";
import { OrganizationDetailPage } from "@/components/detail/OrganizationDetailPage";

export const metadata: Metadata = {
  title: "Organization detail",
  description: "Synthetic organization assessment detail and evidence lineage.",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function OrganizationDetailRoute({
  params,
}: {
  params: Promise<{ organizationRef: string }>;
}) {
  const { organizationRef } = await params;
  const view = await buildOrganizationDetailPageView(
    getDemoAuthorizationContext(),
    organizationRef,
  );
  if (view.state === "not_found" || view.state === "malformed") notFound();
  return <OrganizationDetailPage view={view} />;
}
