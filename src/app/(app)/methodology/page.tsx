import type { Metadata } from "next";
import { buildMethodologyPageView } from "@/application/methodology-service";
import { getDemoAuthorizationContext } from "@/authorization/demo-context";
import { MethodologyPage } from "@/components/methodology/MethodologyPage";

export const metadata: Metadata = {
  title: "Methodology",
  description: "Synthetic assessment methodology and deterministic rule documentation.",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function MethodologyRoute() {
  const view = await buildMethodologyPageView(getDemoAuthorizationContext());
  return <MethodologyPage view={view} />;
}
