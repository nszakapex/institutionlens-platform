import type { Metadata } from "next";
import { buildBriefDocumentPageView } from "@/application/brief-service";
import { getDemoAuthorizationContext } from "@/authorization/demo-context";
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
  const view = await buildBriefDocumentPageView(getDemoAuthorizationContext(), briefRef);
  return <BriefDocumentPage view={view} />;
}
