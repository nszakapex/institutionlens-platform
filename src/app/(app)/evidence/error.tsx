"use client";

import Link from "next/link";
import { ErrorState } from "@/components/status/States";

export default function EvidenceError({ reset }: { reset: () => void }) {
  return (
    <div>
      <ErrorState
        title="Evidence catalog unavailable"
        description="The synthetic catalog could not load. Restricted and internal details are not shown."
      />
      <p className="il-filter-actions">
        <button
          className="il-button il-button--primary il-button--md"
          type="button"
          onClick={reset}
        >
          Retry
        </button>
        <Link className="il-button il-button--secondary il-button--md" href="/evidence">
          Clear filters
        </Link>
      </p>
    </div>
  );
}
