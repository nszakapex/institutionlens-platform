"use client";

import Link from "next/link";
import { ErrorState } from "@/components/status/States";

export default function BriefsError({ reset }: { reset: () => void }) {
  return (
    <div>
      <ErrorState
        title="Briefs unavailable"
        description="The synthetic brief directory could not load. Internal identifiers and restricted details are not shown."
      />
      <p className="il-filter-actions">
        <button
          className="il-button il-button--primary il-button--md"
          type="button"
          onClick={reset}
        >
          Retry
        </button>
        <Link className="il-button il-button--secondary il-button--md" href="/briefs">
          Clear selection
        </Link>
      </p>
    </div>
  );
}
