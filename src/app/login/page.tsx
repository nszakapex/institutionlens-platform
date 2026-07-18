import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { isLiveAppMode, loadServerEnv } from "@/lib/env";
import { safeReturnPath } from "@/lib/safe-return-path";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to InstitutionLens.",
  robots: { index: false, follow: false, noarchive: true },
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ returnTo?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const returnTo = safeReturnPath(params.returnTo);

  let liveMode = false;
  try {
    liveMode = isLiveAppMode(loadServerEnv().IL_APP_MODE);
  } catch {
    liveMode = false;
  }

  return (
    <main id="main" className="il-login-page" tabIndex={-1}>
      <p className="il-eyebrow">InstitutionLens</p>
      <h1 className="il-page-title">Sign in</h1>
      <p className="il-lede">
        {liveMode
          ? "Use the credentials issued for your founding workspace. Sessions are server-bound; tenant context is never selected in the browser."
          : "Sign-in is available only when the app runs in a live mode (development, staging, or production). Local demo uses a synthetic workspace without Auth."}
      </p>
      {liveMode ? <LoginForm returnTo={returnTo} /> : null}
      <p className="il-field-hint">
        Invitation-only access. <Link href="/request-access">Read how founding access works</Link>
        {" · "}
        <Link href="/">Public site</Link>
      </p>
    </main>
  );
}
