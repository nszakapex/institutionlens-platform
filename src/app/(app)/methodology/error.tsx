"use client";

import Link from "next/link";
import { ErrorState } from "@/components/status/States";

export default function MethodologyError({ reset }: { reset: () => void }) {
  return (
    <div>
      <ErrorState
        title="Methodology unavailable"
        description="The versioned synthetic methodology could not load. Internal rule logic is not shown."
      />
      <p className="il-filter-actions">
        <button
          className="il-button il-button--primary il-button--md"
          type="button"
          onClick={reset}
        >
          Retry
        </button>
        <Link className="il-button il-button--secondary il-button--md" href="/">
          Back to overview
        </Link>
      </p>
    </div>
  );
}
