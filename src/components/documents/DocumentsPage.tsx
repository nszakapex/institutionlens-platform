import type { DocumentsPageView } from "@/application/document-view-models";
import { DocumentLinkForm } from "@/components/documents/DocumentLinkForm";
import { DocumentUploadForm } from "@/components/documents/DocumentUploadForm";
import {
  EmptyState,
  ErrorState,
  RestrictedState,
  SyntheticNotice,
} from "@/components/status/States";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";

export function DocumentsPage({ view }: { view: DocumentsPageView }) {
  if (view.state === "unauthorized") {
    return (
      <RestrictedState
        title="Documents unavailable"
        description={view.stateMessage ?? "Document access is not granted for this role."}
      />
    );
  }

  if (view.state === "error") {
    return (
      <ErrorState
        title="Documents unavailable"
        description={view.stateMessage ?? "Tenant documents could not be loaded."}
      />
    );
  }

  return (
    <div className="il-documents-page">
      <PageHeader
        title="Documents"
        description="Upload tenant research files and link them to institutions before outreach. Files stay private to this workspace."
        meta={<StatusBadge tone="info">{view.total} documents</StatusBadge>}
      />

      <SyntheticNotice>
        Local-demo document vault stores files under a server-only tenant path. Live modes require a
        privileged write path before uploads persist to Postgres.
      </SyntheticNotice>

      {view.canUpload ? (
        <section className="il-stack-section" aria-labelledby="upload-title">
          <SectionHeader
            eyebrow="Tenant vault"
            title="Upload a document"
            description="Bring portfolio lists, research notes, and model-interest materials into the workspace."
          />
          <h2 id="upload-title" className="sr-only">
            Upload a document
          </h2>
          <DocumentUploadForm
            organizationOptions={view.organizationOptions}
            classificationOptions={view.classificationOptions}
            allowedExtensionsLabel={view.allowedExtensionsLabel}
            maxBytesLabel={view.maxBytesLabel}
          />
        </section>
      ) : null}

      <section className="il-stack-section" aria-labelledby="library-title">
        <SectionHeader
          eyebrow="Library"
          title="Workspace documents"
          description="Link files to organizations so analysts can find them during brief and compare work."
        />
        <h2 id="library-title" className="sr-only">
          Workspace documents
        </h2>

        {view.rows.length === 0 ? (
          <EmptyState
            title="No documents yet"
            description="Upload a research file to start the tenant document vault."
          />
        ) : (
          <div className="il-research-table-wrap">
            <table className="il-research-table">
              <thead>
                <tr>
                  <th scope="col">Document</th>
                  <th scope="col">Classification</th>
                  <th scope="col">Status</th>
                  <th scope="col">Size</th>
                  <th scope="col">Organization</th>
                  <th scope="col">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {view.rows.map((row) => (
                  <tr key={row.documentPublicRef}>
                    <td>
                      <div className="il-result-record">
                        <p className="il-result-record-title">{row.title}</p>
                        <p className="il-result-record-meta">
                          {row.originalFilename}
                          {row.synthetic ? " · synthetic" : ""}
                        </p>
                        {row.notes ? <p className="il-result-record-meta">{row.notes}</p> : null}
                        <p className="il-filter-actions">
                          <a
                            className="il-button il-button--ghost il-button--sm"
                            href={`/api/documents/${row.documentPublicRef}/download`}
                          >
                            Download
                          </a>
                        </p>
                      </div>
                    </td>
                    <td>{row.classificationLabel}</td>
                    <td>{row.statusLabel}</td>
                    <td>{row.byteSizeLabel}</td>
                    <td>
                      {view.canLink ? (
                        <DocumentLinkForm
                          documentPublicRef={row.documentPublicRef}
                          organizationOptions={view.organizationOptions}
                          currentOrganizationHref={row.organizationHref}
                        />
                      ) : (
                        (row.organizationLabel ?? "Unlinked")
                      )}
                    </td>
                    <td>{row.uploadedAtLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
