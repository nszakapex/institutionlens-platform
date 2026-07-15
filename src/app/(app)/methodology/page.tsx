import type { Metadata } from "next";
import { buildMethodologyPageView } from "@/application/methodology-service";
import { getRequestAccess } from "@/authorization/request-access";
import { MethodologyPage } from "@/components/methodology/MethodologyPage";

export const metadata: Metadata = {
  title: "Methodology",
  description: "Synthetic assessment methodology and deterministic rule documentation.",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function MethodologyRoute() {
  const { context } = await getRequestAccess();
  const view = await buildMethodologyPageView(context);
  return <MethodologyPage view={view} />;
}
