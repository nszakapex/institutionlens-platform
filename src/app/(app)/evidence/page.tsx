import type { Metadata } from "next";
import { buildEvidenceCatalogPageView } from "@/application/evidence-catalog-service";
import { getDemoAuthorizationContext } from "@/authorization/demo-context";
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
  const view = await buildEvidenceCatalogPageView(
    getDemoAuthorizationContext(),
    await searchParams,
  );
  return <EvidenceCatalogPage view={view} />;
}
