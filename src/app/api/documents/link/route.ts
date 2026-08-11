import { NextResponse } from "next/server";
import { getRequestAccess } from "@/authorization/request-access";
import { DomainError } from "@/domain/errors";
import { DocumentPublicRefSchema } from "@/domain/document-public-ref";
import { OrganizationPublicRefSchema } from "@/domain/organization-public-ref";
import { RepositoryError } from "@/repositories/repository-errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { context, repositories } = await getRequestAccess();
    const form = await request.formData();
    const documentRefParsed = DocumentPublicRefSchema.safeParse(
      String(form.get("documentRef") ?? "").trim(),
    );
    const organizationRefRaw = String(form.get("organizationRef") ?? "").trim();

    if (!documentRefParsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid document reference." }, { status: 400 });
    }

    let organizationId: string | null = null;
    if (organizationRefRaw) {
      const orgRef = OrganizationPublicRefSchema.safeParse(organizationRefRaw);
      if (!orgRef.success) {
        return NextResponse.json(
          { ok: false, error: "Invalid organization reference." },
          { status: 400 },
        );
      }
      const org = await repositories.organizations.getByPublicRef(context, orgRef.data);
      organizationId = org.id;
    }

    const updated = await repositories.documents.linkOrganization(context, {
      documentRef: documentRefParsed.data,
      organizationId,
    });

    return NextResponse.json({
      ok: true,
      status: updated.status,
      linked: Boolean(updated.organizationId),
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ ok: false, error: error.publicMessage }, { status: 400 });
    }
    if (error instanceof RepositoryError) {
      return NextResponse.json({ ok: false, error: error.publicMessage }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: "Link failed." }, { status: 500 });
  }
}
