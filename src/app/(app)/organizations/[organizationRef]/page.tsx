import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildOrganizationDetailPageView } from "@/application/detail-service";
import { getRequestAccess } from "@/authorization/request-access";
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
  const { context, repositories } = await getRequestAccess();
  const view = await buildOrganizationDetailPageView(context, organizationRef, repositories);
  if (view.state === "not_found" || view.state === "malformed") notFound();
  return <OrganizationDetailPage view={view} />;
}
