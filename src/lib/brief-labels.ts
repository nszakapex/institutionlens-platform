/**
 * Client-safe brief presentation labels.
 * No server-only imports — safe for Client Components.
 */

export type BriefClassificationLabelKey =
  | "evidence"
  | "assessment"
  | "gap"
  | "limitation"
  | "unavailable"
  | "not_published";

export const BRIEF_CLASSIFICATION_LABELS: Record<BriefClassificationLabelKey, string> = {
  evidence: "Observed evidence",
  assessment: "Assessment output",
  gap: "Gap",
  limitation: "Limitation",
  unavailable: "Unavailable",
  not_published: "Not published",
};

export const BRIEF_DOCUMENT_STATE_LABELS = {
  available: "Available brief",
  insufficient_evidence: "Insufficient evidence",
  not_published: "Not published",
} as const;

/** Stable, ID-free fragment for in-document evidence anchors. */
export function briefEvidenceAnchorId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return `brief-evidence-${slug || "item"}`;
}
