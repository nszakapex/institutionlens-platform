"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type BriefSelectionCandidate = {
  displayName: string;
  organizationType: string;
  assessmentStatusLabel: string;
  briefStateLabel: string;
  organizationPublicRef: string;
  briefHref: string;
  selected: boolean;
};

type Props = {
  candidates: readonly BriefSelectionCandidate[];
  selectedOrgRef: string | null;
};

/**
 * Narrow client island for keyboard-accessible brief organization selection.
 * Receives only frozen redacted labels and opaque public refs.
 */
export function BriefSelectionForm({ candidates, selectedOrgRef }: Props) {
  const router = useRouter();
  const helpId = useId();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(selectedOrgRef);

  const selectedCandidate = useMemo(
    () => candidates.find((item) => item.organizationPublicRef === selected) ?? null,
    [candidates, selected],
  );

  function openSelected(): void {
    if (!selectedCandidate) return;
    startTransition(() => {
      router.push(selectedCandidate.briefHref);
    });
  }

  function selectOnly(): void {
    if (!selected) return;
    startTransition(() => {
      router.push(`/briefs?org=${selected}`);
    });
  }

  return (
    <form
      className="il-brief-selection-form"
      onSubmit={(event) => {
        event.preventDefault();
        openSelected();
      }}
    >
      <fieldset className="il-brief-fieldset" disabled={pending}>
        <legend className="il-brief-legend">Select an organization</legend>
        <p className="il-muted" id={helpId}>
          Use arrow keys within the list, then Open brief. Brief availability varies by assessment
          and publication state; listing an organization does not guarantee a fully publishable
          assessment.
        </p>
        <ul className="il-brief-candidate-list" aria-describedby={helpId}>
          {candidates.map((candidate) => {
            const isSelected = candidate.organizationPublicRef === selected;
            return (
              <li key={candidate.organizationPublicRef}>
                <label className="il-brief-candidate">
                  <input
                    type="radio"
                    name="brief-org"
                    value={candidate.organizationPublicRef}
                    checked={isSelected}
                    onChange={() => setSelected(candidate.organizationPublicRef)}
                    aria-label={`${candidate.displayName}, ${candidate.briefStateLabel}`}
                  />
                  <span className="il-brief-candidate-copy">
                    <span className="il-brief-candidate-name">{candidate.displayName}</span>
                    <span className="il-muted">
                      {candidate.organizationType} · {candidate.assessmentStatusLabel} ·{" "}
                      {candidate.briefStateLabel}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
      <div className="il-filter-actions il-no-print">
        <button
          className="il-button il-button--primary il-button--md"
          type="submit"
          disabled={!selectedCandidate || pending}
        >
          Open brief
        </button>
        <button
          className="il-button il-button--secondary il-button--md"
          type="button"
          disabled={!selected || pending}
          onClick={selectOnly}
        >
          Highlight selection
        </button>
        <button
          className="il-button il-button--ghost il-button--md"
          type="button"
          disabled={pending}
          onClick={() => {
            setSelected(null);
            startTransition(() => router.push("/briefs"));
          }}
        >
          Clear selection
        </button>
      </div>
      <p className="il-brief-live-status" role="status" aria-live="polite">
        {selectedCandidate
          ? `Selected ${selectedCandidate.displayName} (${selectedCandidate.briefStateLabel}).`
          : "No organization selected."}
        {pending ? " Updating…" : null}
      </p>
    </form>
  );
}
