import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "InstitutionLens — Synthetic demo foundation",
  description:
    "Institutional fit, made explainable. Synthetic demo foundation with no real organization data.",
  robots: {
    index: false,
    follow: false,
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

  return (
    <html lang="en">
      <body data-app-mode="local-demo" data-nonce={nonce ? "present" : "absent"}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
