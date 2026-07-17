import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { isLiveAppMode, loadServerEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to InstitutionLens.",
  robots: { index: false, follow: false, noarchive: true },
};

export const dynamic = "force-dynamic";

export default function LoginPage() {
  let liveMode = false;
  try {
    liveMode = isLiveAppMode(loadServerEnv().IL_APP_MODE);
  } catch {
    liveMode = false;
  }

  return (
    <main id="main" className="il-stack-section" style={{ maxWidth: "28rem", margin: "4rem auto" }}>
      <h1 className="il-page-title">Sign in</h1>
      <p className="il-field-hint">
        {liveMode
          ? "Use your InstitutionLens credentials. Sessions are server-bound; tenant context is never selected in the browser."
          : "Sign-in is available only when the app runs in a live mode (development, staging, or production)."}
      </p>
      {liveMode ? <LoginForm /> : null}
    </main>
  );
}
