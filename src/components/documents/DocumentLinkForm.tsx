"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";

type OrgOption = Readonly<{ organizationPublicRef: string; label: string }>;

type Props = {
  documentPublicRef: string;
  organizationOptions: readonly OrgOption[];
  currentOrganizationHref: string | null;
};

export function DocumentLinkForm({
  documentPublicRef,
  organizationOptions,
  currentOrganizationHref,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const data = new FormData(event.currentTarget);
    data.set("documentRef", documentPublicRef);
    try {
      const response = await fetch("/api/documents/link", {
        method: "POST",
        body: data,
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Link failed.");
        setPending(false);
        return;
      }
      setPending(false);
      router.refresh();
    } catch {
      setError("Link failed.");
      setPending(false);
    }
  }

  return (
    <form className="il-document-link" onSubmit={onSubmit}>
      <select
        className="il-select"
        name="organizationRef"
        defaultValue=""
        aria-label="Link organization"
      >
        <option value="">Unlinked</option>
        {organizationOptions.map((option) => (
          <option key={option.organizationPublicRef} value={option.organizationPublicRef}>
            {option.label}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save link"}
      </Button>
      {currentOrganizationHref ? (
        <a className="il-text-link" href={currentOrganizationHref}>
          Open org
        </a>
      ) : null}
      {error ? (
        <span className="il-form-error" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}
