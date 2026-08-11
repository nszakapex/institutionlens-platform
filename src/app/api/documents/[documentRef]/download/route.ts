import { NextResponse } from "next/server";
import { getRequestAccess } from "@/authorization/request-access";
import { DomainError } from "@/domain/errors";
import { DocumentPublicRefSchema } from "@/domain/document-public-ref";
import { RepositoryError } from "@/repositories/repository-errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ documentRef: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { documentRef: raw } = await params;
    const documentRefParsed = DocumentPublicRefSchema.safeParse(raw);
    if (!documentRefParsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid document reference." }, { status: 400 });
    }

    const { context, repositories } = await getRequestAccess();
    const doc = await repositories.documents.getByPublicRef(context, documentRefParsed.data);
    const bytes = await repositories.documents.readBytes(context, documentRefParsed.data);

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": doc.contentType,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="${doc.originalFilename.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ ok: false, error: error.publicMessage }, { status: 404 });
    }
    if (error instanceof RepositoryError) {
      return NextResponse.json({ ok: false, error: error.publicMessage }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: "Download failed." }, { status: 500 });
  }
}
