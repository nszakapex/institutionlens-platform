import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { loadRepositoryConfig } from "@/repositories/repository-config";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    default: "InstitutionLens",
    template: "%s · InstitutionLens",
  },
  description:
    "Institutional fit, made explainable. Synthetic demo application shell — no real organization data.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
  icons: {
    icon: "/brand/institutionlens-mark.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#F5F1E9",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const nonce = headerStore.get("x-nonce") ?? undefined;
  const appMode = loadRepositoryConfig().mode;

  return (
    <html lang="en">
      <body data-app-mode={appMode} data-nonce={nonce ? "present" : "absent"}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
