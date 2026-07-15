import type { Metadata } from "next";
import { buildBriefDirectoryPageView } from "@/application/brief-service";
import { getRequestAccess } from "@/authorization/request-access";
import { BriefsWorkspacePage } from "@/components/briefs/BriefsWorkspacePage";

export const metadata: Metadata = {
  title: "Briefs",
  description: "Synthetic institutional brief directory for authorized research preparation.",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function BriefsDirectoryRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { context, repositories } = await getRequestAccess();
  const view = await buildBriefDirectoryPageView(context, params, repositories);
  return <BriefsWorkspacePage view={view} />;
}
