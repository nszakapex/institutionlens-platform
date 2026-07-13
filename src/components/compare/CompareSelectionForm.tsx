"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { COMPARE_URL_MAX_ORGS, COMPARE_URL_MIN_ORGS, buildCompareHref } from "@/lib/compare-url";

/** Redacted labels + opaque refs only — mirrored from the server view model. */
type CompareCandidateOption = {
  publicRef: string;
  displayName: string;
  organizationType: string;
  assessmentStatusLabel: string;
  selected: boolean;
};

type Props = {
  candidates: readonly CompareCandidateOption[];
  selectedRefs: readonly string[];
  maxOrganizations?: number;
  minOrganizations?: number;
};

/**
 * Narrow client selector: redacted labels + opaque refs only.
 * Must not import server services, authorization, or server-only query modules.
 * Server parsing remains authoritative after navigation.
 * Remount via key={selectedRefs.join("|")} when the URL selection changes.
 */
export function CompareSelectionForm({
  candidates,
  selectedRefs,
  maxOrganizations = COMPARE_URL_MAX_ORGS,
  minOrganizations = COMPARE_URL_MIN_ORGS,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(() => [...selectedRefs]);
  const [statusMessage, setStatusMessage] = useState("");

  function toggle(ref: string) {
    setSelected((previous) => {
      if (previous.includes(ref)) {
        const next = previous.filter((item) => item !== ref);
        setStatusMessage(`Removed one organization. ${next.length} selected.`);
        return next;
      }
      if (previous.length >= maxOrganizations) {
        setStatusMessage(
          `Maximum ${maxOrganizations} organizations. Remove one before adding another.`,
        );
        return previous;
      }
      const next = [...previous, ref];
      setStatusMessage(`Added one organization. ${next.length} selected.`);
      return next;
    });
  }

  function applySelection() {
    const href = buildCompareHref(selected);
    setStatusMessage(
      selected.length < minOrganizations
        ? `Selection updated. Add at least ${minOrganizations - selected.length} more to compare.`
        : `Comparison updated with ${selected.length} organizations.`,
    );
    startTransition(() => {
      router.push(href);
    });
  }

  const atMaximum = selected.length >= maxOrganizations;

  return (
    <form
      className="il-compare-selection-form"
      method="get"
      action="/compare"
      onSubmit={(event) => {
        event.preventDefault();
        applySelection();
      }}
    >
      <fieldset className="il-compare-fieldset">
        <legend className="il-compare-legend">Organizations to compare</legend>
        <p className="il-muted" id="compare-selection-help">
          Select {minOrganizations} or {maxOrganizations} synthetic organizations. The shareable URL
          uses opaque organization references only.
        </p>
        <ul className="il-compare-candidate-list" aria-describedby="compare-selection-help">
          {candidates.map((candidate) => {
            const checked = selected.includes(candidate.publicRef);
            const blocked = !checked && atMaximum;
            return (
              <li key={candidate.publicRef}>
                <label className="il-compare-candidate">
                  <input
                    type="checkbox"
                    name="org"
                    value={candidate.publicRef}
                    checked={checked}
                    disabled={blocked}
                    onChange={() => toggle(candidate.publicRef)}
                  />
                  <span>
                    <span className="il-compare-candidate-name">{candidate.displayName}</span>
                    <span className="il-muted">
                      {candidate.organizationType} · {candidate.assessmentStatusLabel}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
      <div className="il-filter-actions">
        <button className="il-button il-button--primary il-button--md" type="submit">
          Update comparison
        </button>
        <button
          className="il-button il-button--secondary il-button--md"
          type="button"
          onClick={() => {
            setSelected([]);
            setStatusMessage("Cleared selection.");
            startTransition(() => {
              router.push("/compare");
            });
          }}
        >
          Clear selection
        </button>
      </div>
      <p className="il-compare-live-status" role="status" aria-live="polite">
        {statusMessage ||
          `${selected.length} of ${maxOrganizations} selected. ${
            selected.length < minOrganizations
              ? `Select at least ${minOrganizations} to open the comparison.`
              : "Ready to compare."
          }`}
      </p>
    </form>
  );
}
