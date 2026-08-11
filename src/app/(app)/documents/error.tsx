"use client";

import Link from "next/link";
import { ErrorState } from "@/components/status/States";

export default function DocumentsError({ reset }: { reset: () => void }) {
  return (
    <div>
      <ErrorState
        title="Document vault unavailable"
        description="Tenant documents could not load. File contents and internal identifiers are not shown."
      />
      <p className="il-filter-actions">
        <button
          className="il-button il-button--primary il-button--md"
          type="button"
          onClick={reset}
        >
          Retry
        </button>
        <Link className="il-button il-button--secondary il-button--md" href="/documents">
          Return to documents
        </Link>
      </p>
    </div>
  );
}
