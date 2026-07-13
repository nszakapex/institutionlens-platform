"use client";

import Link from "next/link";
import { ErrorState } from "@/components/status/States";

export default function OrganizationDetailError({ reset }: { reset: () => void }) {
  return (
    <div className="il-stack-section">
      <ErrorState
        title="Organization detail unavailable"
        description="The synthetic research record could not load. Internal details are not shown."
      />
      <p className="il-filter-actions">
        <button
          className="il-button il-button--primary il-button--md"
          type="button"
          onClick={reset}
        >
          Retry
        </button>
        <Link className="il-button il-button--secondary il-button--md" href="/organizations">
          Back to organizations
        </Link>
      </p>
    </div>
  );
}
