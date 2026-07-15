import type { Metadata } from "next";
import { buildBriefDocumentPageView } from "@/application/brief-service";
import { getRequestAccess } from "@/authorization/request-access";
import { BriefDocumentPage } from "@/components/briefs/BriefDocumentPage";

export const metadata: Metadata = {
  title: "Institutional brief",
  description: "Synthetic evidence-backed institutional brief for authorized research preparation.",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function BriefDocumentRoute({
  params,
}: {
  params: Promise<{ briefRef: string }>;
}) {
  const { briefRef } = await params;
  const { context, repositories } = await getRequestAccess();
  const view = await buildBriefDocumentPageView(context, briefRef, repositories);
  return <BriefDocumentPage view={view} />;
}
