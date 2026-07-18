import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { isLiveAppMode, loadServerEnv } from "@/lib/env";
import { safeReturnPath } from "@/lib/safe-return-path";
import { LensMark } from "@/components/svg/LensMark";
import { SignalField } from "@/components/svg/SignalField";

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
    <main id="main" className="il-login-scene" tabIndex={-1}>
      <SignalField className="il-login-field" />
      <div className="il-login-panel">
        <div className="il-login-panel-head">
          <LensMark width={22} height={22} />
          <span>InstitutionLens</span>
        </div>
        <div className="il-login-panel-body">
          <p className="il-eyebrow">Founding workspace</p>
          <h1 className="il-page-title">Sign in</h1>
          <p className="il-lede">
            {liveMode
              ? "Use the credentials issued for your founding workspace. Sessions are server-bound; tenant context is never selected in the browser."
              : "Sign-in is available only when the app runs in a live mode (development, staging, or production). Local demo uses a synthetic workspace without Auth."}
          </p>
          {liveMode ? <LoginForm returnTo={returnTo} /> : null}
        </div>
        <p className="il-login-panel-foot">
          Invitation-only access. <Link href="/request-access">Read how founding access works</Link>
        </p>
      </div>
      <p className="il-login-return">
        <Link href="/">← Return to the public site</Link>
      </p>
    </main>
  );
}
