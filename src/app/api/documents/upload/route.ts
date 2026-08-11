import { NextResponse } from "next/server";
import { getRequestAccess } from "@/authorization/request-access";
import { DomainError } from "@/domain/errors";
import { documentPublicRefFor } from "@/domain/document-public-ref";
import { OrganizationPublicRefSchema } from "@/domain/organization-public-ref";
import {
  DocumentClassificationSchema,
  DOCUMENT_UPLOAD_ALLOWLIST,
  MAX_DOCUMENT_BYTES,
  type DocumentContentType,
} from "@/domain/schemas/document";
import { RepositoryError } from "@/repositories/repository-errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function extensionOf(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx < 0) return "";
  return filename.slice(idx).toLowerCase();
}

export async function POST(request: Request) {
  try {
    const { context, repositories } = await getRequestAccess();
    const form = await request.formData();
    const title = String(form.get("title") ?? "").trim();
    const notesRaw = String(form.get("notes") ?? "").trim();
    const classificationParsed = DocumentClassificationSchema.safeParse(
      String(form.get("classification") ?? ""),
    );
    const organizationRefRaw = String(form.get("organizationRef") ?? "").trim();
    const file = form.get("file");

    if (!title || !classificationParsed.success || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Invalid upload request." }, { status: 400 });
    }

    if (file.size < 1 || file.size > MAX_DOCUMENT_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Document size is outside allowed bounds." },
        { status: 400 },
      );
    }

    const filename = file.name || "upload.bin";
    const ext = extensionOf(filename);
    const expected = DOCUMENT_UPLOAD_ALLOWLIST[ext as keyof typeof DOCUMENT_UPLOAD_ALLOWLIST];
    if (!expected) {
      return NextResponse.json({ ok: false, error: "Document type is not allowed." }, { status: 400 });
    }

    let organizationId: string | null = null;
    if (organizationRefRaw) {
      const orgRef = OrganizationPublicRefSchema.safeParse(organizationRefRaw);
      if (!orgRef.success) {
        return NextResponse.json({ ok: false, error: "Invalid organization reference." }, { status: 400 });
      }
      const org = await repositories.organizations.getByPublicRef(context, orgRef.data);
      organizationId = org.id;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const uploaded = await repositories.documents.upload(context, {
      title,
      originalFilename: filename,
      classification: classificationParsed.data,
      contentType: expected as DocumentContentType,
      bytes,
      organizationId,
      ...(notesRaw ? { notes: notesRaw } : {}),
    });

    return NextResponse.json({
      ok: true,
      documentRef: documentPublicRefFor(context.tenant.id, uploaded.id),
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ ok: false, error: error.publicMessage }, { status: 400 });
    }
    if (error instanceof RepositoryError) {
      return NextResponse.json({ ok: false, error: error.publicMessage }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: "Upload failed." }, { status: 500 });
  }
}
