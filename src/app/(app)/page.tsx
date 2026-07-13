import type { Metadata } from "next";
import { getDemoAuthorizationContext } from "@/authorization/demo-context";
import { buildOverviewPageView } from "@/application/overview-service";
import { OverviewPage } from "@/components/overview/OverviewPage";

export const metadata: Metadata = {
  title: "Overview",
  description: "InstitutionLens synthetic portfolio overview and prioritization heuristics.",
};

export default async function OverviewRoute() {
  const context = getDemoAuthorizationContext();
  const view = await buildOverviewPageView(context);
  return <OverviewPage view={view} />;
}
