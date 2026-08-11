import type { Metadata } from "next";
import { buildDocumentsPageView } from "@/application/document-service";
import { getRequestAccess } from "@/authorization/request-access";
import { DocumentsPage } from "@/components/documents/DocumentsPage";

export const metadata: Metadata = {
  title: "Documents",
  description: "Tenant document vault for institutional research materials.",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function DocumentsRoute() {
  const { context, repositories } = await getRequestAccess();
  const view = await buildDocumentsPageView(context, repositories);
  return <DocumentsPage view={view} />;
}
