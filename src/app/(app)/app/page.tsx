import type { Metadata } from "next";
import { getRequestAccess } from "@/authorization/request-access";
import { buildOverviewPageView } from "@/application/overview-service";
import { OverviewPage } from "@/components/overview/OverviewPage";

export const metadata: Metadata = {
  title: "Overview",
  description: "InstitutionLens synthetic portfolio overview and prioritization heuristics.",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function OverviewRoute() {
  const { context, repositories } = await getRequestAccess();
  const view = await buildOverviewPageView(context, repositories);
  return <OverviewPage view={view} />;
}
