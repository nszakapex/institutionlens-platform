import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { loadRepositoryConfig } from "@/repositories/repository-config";
import "@/app/globals.css";

/**
 * Public marketing pages must render even when repository/live config is absent
 * or mixed. Authenticated routes continue to fail closed via getRequestAccess().
 */
function resolveShellAppMode(): string {
  try {
    return loadRepositoryConfig().mode;
  } catch {
    return "unconfigured";
  }
}

export const metadata: Metadata = {
  title: {
    default: "InstitutionLens",
    template: "%s · InstitutionLens",
  },
  description:
    "Institutional fit, made explainable. Research workspace for evidence-backed outreach preparation — not investment advice.",
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
  const appMode = resolveShellAppMode();

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
