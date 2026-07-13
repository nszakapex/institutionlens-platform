"use client";

import Link from "next/link";
import { ErrorState } from "@/components/status/States";

export default function CompareError({ reset }: { reset: () => void }) {
  return (
    <div>
      <ErrorState
        title="Comparison unavailable"
        description="The synthetic comparison could not load. Internal identifiers and restricted details are not shown."
      />
      <p className="il-filter-actions">
        <button
          className="il-button il-button--primary il-button--md"
          type="button"
          onClick={reset}
        >
          Retry
        </button>
        <Link className="il-button il-button--secondary il-button--md" href="/compare">
          Clear selection
        </Link>
      </p>
    </div>
  );
}
