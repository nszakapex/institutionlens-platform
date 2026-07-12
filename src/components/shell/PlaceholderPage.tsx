import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";
import { SyntheticNotice } from "@/components/status/States";

type Props = {
  title: string;
  summary: string;
};

export function PlaceholderPage({ title, summary }: Props) {
  return (
    <div className="il-placeholder-page">
      <PageHeader
        title={title}
        description={summary}
        meta={<StatusBadge tone="warning">Unavailable · later phase</StatusBadge>}
      />
      <SyntheticNotice label="Unavailable · later phase">
        This surface is not implemented yet. It is a synthetic foundation placeholder so shell
        navigation can be reviewed. No product data, scoring, or workflows are available here.
      </SyntheticNotice>
    </div>
  );
}

export function placeholderMetadata(title: string): Metadata {
  return { title: `${title} (placeholder)` };
}
