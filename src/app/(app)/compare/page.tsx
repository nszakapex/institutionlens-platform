import type { Metadata } from "next";
import { buildComparePageView } from "@/application/compare-service";
import { getDemoAuthorizationContext } from "@/authorization/demo-context";
import { ComparePage } from "@/components/compare/ComparePage";

export const metadata: Metadata = {
  title: "Compare",
  description: "Side-by-side comparison of up to three synthetic organizations.",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function CompareRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const view = await buildComparePageView(getDemoAuthorizationContext(), params);
  return <ComparePage view={view} />;
}
