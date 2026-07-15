import type { Metadata } from "next";
import { getRequestAccess } from "@/authorization/request-access";
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
  const { context, repositories } = await getRequestAccess();
  const params = await searchParams;
  const view = await buildExplorerPageView(context, params, repositories);
  return <ExplorerPage view={view} />;
}
