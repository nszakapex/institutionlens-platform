"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/status/States";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Route error boundary — safe language only; no stack traces or internal IDs.
 */
export default function AppError({ reset }: Props) {
  useEffect(() => {
    // Intentionally do not log error details to the UI.
  }, []);

  return (
    <div className="il-stack-section">
      <ErrorState
        title="Something went wrong"
        description="This view could not be loaded. You may need to sign in, or the request was denied. Retry or return to the overview."
      />
      <p className="il-filter-actions">
        <button
          type="button"
          className="il-button il-button--primary il-button--md"
          onClick={reset}
        >
          Retry
        </button>
        <Link className="il-button il-button--secondary il-button--md" href="/">
          Return to overview
        </Link>
      </p>
    </div>
  );
}
