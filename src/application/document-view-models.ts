export type DocumentRowView = Readonly<{
  documentPublicRef: string;
  title: string;
  originalFilename: string;
  classificationLabel: string;
  statusLabel: string;
  contentType: string;
  byteSizeLabel: string;
  organizationLabel: string | null;
  organizationHref: string | null;
  uploadedAtLabel: string;
  synthetic: boolean;
  notes: string | null;
}>;

export type DocumentOrgOption = Readonly<{
  organizationPublicRef: string;
  label: string;
}>;

export type DocumentsPageView = Readonly<{
  state: "ready" | "unauthorized" | "error";
  stateMessage: string | null;
  rows: readonly DocumentRowView[];
  total: number;
  canUpload: boolean;
  canLink: boolean;
  organizationOptions: readonly DocumentOrgOption[];
  classificationOptions: readonly { value: string; label: string }[];
  allowedExtensionsLabel: string;
  maxBytesLabel: string;
}>;
