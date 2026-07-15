import type { Metadata } from "next";
import { buildEvidenceCatalogPageView } from "@/application/evidence-catalog-service";
import { getRequestAccess } from "@/authorization/request-access";
import { EvidenceCatalogPage } from "@/components/evidence/EvidenceCatalogPage";

export const metadata: Metadata = {
  title: "Evidence",
  description: "Synthetic evidence and provenance catalog.",
  robots: { index: false, follow: false, noarchive: true },
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function EvidenceRoute({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { context, repositories } = await getRequestAccess();
  const view = await buildEvidenceCatalogPageView(context, await searchParams, repositories);
  return <EvidenceCatalogPage view={view} />;
}
