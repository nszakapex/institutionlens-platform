"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/status/States";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function OrganizationsError({ reset }: Props) {
  useEffect(() => {
    // Keep error details out of the rendered surface.
  }, []);

  return (
    <div className="il-stack-section">
      <ErrorState
        title="Organization explorer unavailable"
        description="The explorer could not load the synthetic organization read model. Retry or clear filters. Internal details are not shown."
      />
      <p className="il-filter-actions">
        <button
          type="button"
          className="il-button il-button--primary il-button--md"
          onClick={reset}
        >
          Retry
        </button>
        <Link className="il-button il-button--secondary il-button--md" href="/organizations">
          Reset explorer
        </Link>
      </p>
    </div>
  );
}
