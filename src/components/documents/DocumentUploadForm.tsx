"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";

type OrgOption = Readonly<{ organizationPublicRef: string; label: string }>;
type ClassOption = Readonly<{ value: string; label: string }>;

type Props = {
  organizationOptions: readonly OrgOption[];
  classificationOptions: readonly ClassOption[];
  allowedExtensionsLabel: string;
  maxBytesLabel: string;
};

export function DocumentUploadForm({
  organizationOptions,
  classificationOptions,
  allowedExtensionsLabel,
  maxBytesLabel,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: data,
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Upload failed.");
        setPending(false);
        return;
      }
      form.reset();
      setPending(false);
      router.refresh();
    } catch {
      setError("Upload failed.");
      setPending(false);
    }
  }

  return (
    <form className="il-document-upload" onSubmit={onSubmit}>
      <div className="il-filter-grid">
        <label className="il-field">
          <span className="il-field-label">Title</span>
          <input
            className="il-input"
            name="title"
            required
            maxLength={160}
            placeholder="e.g. Northeast credit-union research pack"
          />
        </label>
        <label className="il-field">
          <span className="il-field-label">Classification</span>
          <select className="il-select" name="classification" required defaultValue="research_note">
            {classificationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="il-field">
          <span className="il-field-label">Link organization (optional)</span>
          <select className="il-select" name="organizationRef" defaultValue="">
            <option value="">Unlinked — review later</option>
            {organizationOptions.map((option) => (
              <option key={option.organizationPublicRef} value={option.organizationPublicRef}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="il-field">
          <span className="il-field-label">File</span>
          <input
            className="il-input"
            name="file"
            type="file"
            required
            accept={allowedExtensionsLabel.replace(/\s+/g, "")}
          />
        </label>
        <label className="il-field il-field--wide">
          <span className="il-field-label">Internal note (optional)</span>
          <input
            className="il-input"
            name="notes"
            maxLength={240}
            placeholder="Why this file matters for outreach prep"
          />
        </label>
      </div>
      <p className="il-research-disclaimer">
        Allowed: {allowedExtensionsLabel}. Max size: {maxBytesLabel}. Files stay tenant-private and
        are not published as investment recommendations.
      </p>
      {error ? (
        <p className="il-form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="il-filter-actions">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Uploading…" : "Upload document"}
        </Button>
      </div>
    </form>
  );
}
