import type { Metadata } from "next";
import { getDemoAuthorizationContext } from "@/authorization/demo-context";
import { buildExplorerPageView } from "@/application/explorer-service";
import { ExplorerPage } from "@/components/explorer/ExplorerPage";

export const metadata: Metadata = {
  title: "Organizations",
  description: "Search and filter the InstitutionLens synthetic organization universe.",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function OrganizationsRoute({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const context = getDemoAuthorizationContext();
  const params = await searchParams;
  const view = await buildExplorerPageView(context, params);
  return <ExplorerPage view={view} />;
}
